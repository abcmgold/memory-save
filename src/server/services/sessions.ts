import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "../db/client";

// data-model.md › sessions ; research.md R4
export const SESSION_COOKIE = "ms_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY_MS = 86_400_000;

export type SessionUser = {
  id: string;
  username: string | null; // only ever shown to its owner; null for Google accounts (002)
  googleEmail: string | null; // only ever shown to its owner (002 FR-G09)
  handle: string;
  displayName: string | null;
  lastAudience: schema.LastAudience;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await getDb().insert(schema.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

/** Resolves a session token to its user; slides the expiry when it is getting close. */
export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const db = getDb();
  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      expiresAt: schema.sessions.expiresAt,
      id: schema.users.id,
      username: schema.users.username,
      googleEmail: schema.users.googleEmail,
      handle: schema.users.handle,
      displayName: schema.users.displayName,
      lastAudience: schema.users.lastAudience,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * DAY_MS) {
    await db
      .update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS) })
      .where(eq(schema.sessions.tokenHash, tokenHash));
  }
  return { id: row.id, username: row.username, googleEmail: row.googleEmail, handle: row.handle, displayName: row.displayName, lastAudience: row.lastAudience };
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await getDb().delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
}

export async function deleteExpiredSessions(): Promise<number> {
  const rows = await getDb()
    .delete(schema.sessions)
    .where(lt(schema.sessions.expiresAt, new Date()))
    .returning({ t: schema.sessions.tokenHash });
  return rows.length;
}

export function sessionCookie(token: string, expiresAt: Date, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  return [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", secure ? "Secure" : ""]
    .filter(Boolean)
    .join("; ");
}
