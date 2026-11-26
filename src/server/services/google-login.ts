import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db/client";
import { getGoogleConfig } from "../env";
import { errors } from "../http/errors";
import { isHttps, originOf, readCookie } from "../http/request";
import { checkGoogleClaims, codeChallenge, suggestDisplayName } from "../domain/google-identity";
import { authorizeUrl, getGoogleClient } from "./google-oauth";
import { normalizeEmail } from "../domain/email-code";
import { insertUser, pgError, toUserRef } from "./auth";
import { createSession, sessionCookie } from "./sessions";
import { msg, type GoogleLoginError } from "@/lib/messages";
import { safeNext } from "@/lib/safe-next";
import { HOME_PATH } from "@/lib/routes";
import type { UserRef } from "@/lib/types";

// 002-google-login — research R3 (ms_oauth), R4 (pending sign-up), R5 (races), R9 (errors); contracts/api.md
export const OAUTH_COOKIE = "ms_oauth";
export const SIGNUP_COOKIE = "ms_gsignup";
const OAUTH_PATH = "/api/auth/google";
const FLOW_SECONDS = 600; // 10 minutes (FR-G06, FR-G07)

const OAuthState = z.object({
  state: z.string().min(20).max(100),
  verifier: z.string().min(43).max(128),
  next: z.string().max(2000).nullable(),
});
type OAuthState = z.infer<typeof OAuthState>;

export type RedirectResult = { location: string; cookies: string[] };

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookie(name: string, value: string, path: string, maxAge: number, secure: boolean): string {
  return [`${name}=${value}`, `Path=${path}`, "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`, secure ? "Secure" : ""]
    .filter(Boolean)
    .join("; ");
}

export function clearSignupCookie(secure: boolean): string {
  return cookie(SIGNUP_COOKIE, "", "/", 0, secure);
}

/** Absolute callback URL; must be identical at authorize and token-exchange time (research R7). */
export function redirectUri(req: Request): string {
  return `${originOf(req)}${OAUTH_PATH}/callback`;
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function loginError(code: GoogleLoginError, next: string | null): string {
  const q = new URLSearchParams({ error: code });
  if (next) q.set("next", next);
  return `/login?${q.toString()}`;
}

function readOAuthCookie(req: Request): OAuthState | null {
  const raw = readCookie(req, OAUTH_COOKIE);
  if (!raw || raw.length > 4000) return null;
  try {
    const parsed = OAuthState.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    return parsed.success ? { ...parsed.data, next: safeNext(parsed.data.next) } : null;
  } catch {
    return null;
  }
}

/** GET /api/auth/google/start — null when Google is not configured (FR-G01). */
export function buildStart(req: Request, rawNext: string | null): RedirectResult | null {
  const config = getGoogleConfig();
  if (!config) return null;
  const flow: OAuthState = { state: randomToken(), verifier: randomToken(), next: safeNext(rawNext) };
  const value = Buffer.from(JSON.stringify(flow)).toString("base64url");
  return {
    location: authorizeUrl({
      clientId: config.clientId,
      redirectUri: redirectUri(req),
      state: flow.state,
      challenge: codeChallenge(flow.verifier),
    }),
    cookies: [cookie(OAUTH_COOKIE, value, OAUTH_PATH, FLOW_SECONDS, isHttps(req))],
  };
}

/** GET /api/auth/google/callback — never throws; every failure lands on /login?error=… (research R9). */
export async function handleCallback(req: Request): Promise<RedirectResult> {
  const secure = isHttps(req);
  const cookies = [cookie(OAUTH_COOKIE, "", OAUTH_PATH, 0, secure)]; // one-shot
  const flow = readOAuthCookie(req);
  const next = flow?.next ?? null;
  const fail = (code: GoogleLoginError, reason: string): RedirectResult => {
    console.warn(`[google-login] ${code}: ${reason.slice(0, 80)}`); // no codes, tokens or e-mails in logs
    return { location: loginError(code, next), cookies };
  };

  const params = new URL(req.url).searchParams;
  const googleError = params.get("error");
  if (googleError) return fail(googleError === "access_denied" ? "google_cancelled" : "google_failed", googleError);
  const config = getGoogleConfig();
  if (!config) return fail("google_failed", "not configured");
  if (!flow) return fail("google_failed", "missing or invalid flow cookie");
  const state = params.get("state");
  if (!state || !sameString(state, flow.state)) return fail("google_failed", "state mismatch");
  const code = params.get("code");
  if (!code || code.length > 2000) return fail("google_failed", "missing code");

  let claims: unknown;
  try {
    claims = await getGoogleClient().exchangeCode({ code, verifier: flow.verifier, redirectUri: redirectUri(req) });
  } catch (err) {
    return fail("google_failed", err instanceof Error ? err.message : "token exchange failed");
  }
  const checked = checkGoogleClaims(claims, config.clientId, Date.now());
  if (!checked.ok) return fail(checked.reason === "unverified" ? "google_unverified" : "google_failed", checked.reason);
  const { sub, email, name } = checked.identity;

  const db = getDb();
  const signIn = async (userId: string): Promise<RedirectResult> => {
    const session = await createSession(userId);
    cookies.push(sessionCookie(session.token, session.expiresAt, secure));
    return { location: next ?? HOME_PATH, cookies };
  };

  // 005 research R8, FR-E09 — (1) this Google account is linked. The account's e-mail is the one its owner verified;
  // Google never overwrites it.
  const bySub = async () =>
    (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.googleSub, sub)))[0];
  const existing = await bySub();
  if (existing) return signIn(existing.id);

  // (2) An account whose *verified* e-mail is this (Google-verified) e-mail: link Google to it, unless (3) it is
  // already linked to another Google account. `users.email` only ever holds verified addresses (FR-E01).
  const [byEmail] = await db
    .select({ id: schema.users.id, googleSub: schema.users.googleSub })
    .from(schema.users)
    .where(eq(schema.users.email, normalizeEmail(email)));
  if (byEmail) {
    if (byEmail.googleSub) return fail("google_conflict", "e-mail linked to another Google account");
    const linked = await db
      .update(schema.users)
      .set({ googleSub: sub })
      .where(and(eq(schema.users.id, byEmail.id), isNull(schema.users.googleSub)))
      .returning({ id: schema.users.id });
    if (linked.length) return signIn(byEmail.id);
    const raced = await bySub(); // linked from another tab in the meantime
    if (raced) return signIn(raced.id);
    return fail("google_conflict", "e-mail linked to another Google account");
  }

  // New person: Google is sure who they are, the account waits for a confirmed display name (FR-G03).
  const token = randomToken();
  await db.insert(schema.pendingGoogleSignups).values({
    tokenHash: hashToken(token),
    googleSub: sub,
    googleEmail: email,
    suggestedName: suggestDisplayName(name),
    next,
    expiresAt: new Date(Date.now() + FLOW_SECONDS * 1000),
  });
  cookies.push(cookie(SIGNUP_COOKIE, token, "/", FLOW_SECONDS, secure));
  return { location: "/login/google", cookies };
}

export type PendingSignup = { email: string; suggestedName: string; next: string | null };

/** For the /login/google page: the still-valid pending sign-up behind this browser's cookie, or null. */
export async function getPendingSignup(token: string | undefined): Promise<PendingSignup | null> {
  if (!token || token.length > 200) return null;
  const [row] = await getDb()
    .select()
    .from(schema.pendingGoogleSignups)
    .where(
      and(eq(schema.pendingGoogleSignups.tokenHash, hashToken(token)), gt(schema.pendingGoogleSignups.expiresAt, new Date())),
    );
  return row ? { email: row.googleEmail, suggestedName: row.suggestedName, next: safeNext(row.next) } : null;
}

/**
 * POST /api/auth/google/complete — creates the account with the confirmed name (one transaction with consuming the
 * pending row). If the same Google account was just created from another tab, signs into that one (research R5).
 */
export async function completeSignup(
  token: string | undefined,
  displayName: string,
): Promise<{ user: UserRef; next: string | null; created: boolean }> {
  if (!token || token.length > 200) throw errors.gone(msg.googleExpired);
  const db = getDb();
  const tokenHash = hashToken(token);
  let pending: schema.PendingGoogleSignupRow | undefined;
  try {
    return await db.transaction(async (tx) => {
      [pending] = await tx
        .delete(schema.pendingGoogleSignups)
        .where(
          and(eq(schema.pendingGoogleSignups.tokenHash, tokenHash), gt(schema.pendingGoogleSignups.expiresAt, new Date())),
        )
        .returning();
      if (!pending) throw errors.gone(msg.googleExpired);
      const user = await insertUser(
        {
          googleSub: pending.googleSub,
          // 005 data-model.md › users.email, users.email_verified_at — Google verified it (FR-E09 step 4)
          email: normalizeEmail(pending.googleEmail),
          emailVerifiedAt: new Date(),
          displayName: displayName.trim(),
        },
        tx,
      );
      return { user: toUserRef(user), next: safeNext(pending.next), created: true };
    });
  } catch (err) {
    const { code, constraint } = pgError(err);
    // 005 research R8: the Google e-mail was verified by another account in the meantime → 409; Google again matches it.
    if (pending && code === "23505" && constraint === "users_email_unique") {
      await db.delete(schema.pendingGoogleSignups).where(eq(schema.pendingGoogleSignups.tokenHash, tokenHash));
      throw errors.conflict(msg.googleEmailTaken);
    }
    if (!pending || code !== "23505" || constraint !== "users_google_sub_unique") throw err;
    // The transaction rolled back; consume the row now and use the account the other tab created.
    await db.delete(schema.pendingGoogleSignups).where(eq(schema.pendingGoogleSignups.tokenHash, tokenHash));
    const [user] = await db.select().from(schema.users).where(eq(schema.users.googleSub, pending.googleSub));
    if (!user) throw err;
    return { user: toUserRef(user), next: safeNext(pending.next), created: false };
  }
}

/** Session cookie for a user who just finished the Google flow (same session as password login, FR-G02). */
export async function startSession(userId: string, req: Request): Promise<string> {
  const { token, expiresAt } = await createSession(userId);
  return sessionCookie(token, expiresAt, isHttps(req));
}
