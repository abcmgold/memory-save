import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { errors } from "../http/errors";
import { msg } from "@/lib/messages";
import type { UserRef } from "@/lib/types";
import { newInviteToken, toUserRef } from "./auth";
import { areFriends } from "./relations";
import { befriend } from "./friends";

// FR-039..FR-041 — one active invite link per user; opening it while signed in makes you friends.

export type InviteStatus = "available" | "self" | "friends" | "login_required";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,80}$/;

export function isTokenShaped(token: string): boolean {
  return TOKEN_RE.test(token);
}

/** Origin the visitor used (Vercel sets x-forwarded-*), so copied links point at the right host. */
export function originOf(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")).split(",")[0].trim();
  return `${proto}://${host}`;
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin}/add/${token}`;
}

export async function getInviteToken(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ token: schema.users.inviteToken })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!row) throw errors.notFound();
  return row.token;
}

/** "Tạo link mới": the old link stops working immediately. */
export async function rotateInviteToken(userId: string): Promise<string> {
  const token = newInviteToken();
  await getDb().update(schema.users).set({ inviteToken: token }).where(eq(schema.users.id, userId));
  return token;
}

/**
 * Inviter's public name for share cards (003 FR-S07/S09) — display name only. Cached per request so the page,
 * generateMetadata and the Open Graph image share one lookup. Unknown or malformed token → null (FR-S08).
 */
export const inviterNameByToken = cache(async (token: string): Promise<{ id: string; displayName: string } | null> => {
  const inviter = await inviterByToken(token);
  return inviter ? { id: inviter.id, displayName: inviter.displayName } : null;
});

async function inviterByToken(token: string) {
  if (!isTokenShaped(token)) return null;
  const [row] = await getDb()
    .select({ id: schema.users.id, handle: schema.users.handle, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.inviteToken, token));
  return row ?? null;
}

/** Who sent this link and what opening it would do for this viewer. Unknown/old token → 404. */
export async function lookupInvite(
  token: string,
  viewerId: string | null,
): Promise<{ inviter: UserRef; status: InviteStatus }> {
  const inviter = await inviterByToken(token);
  if (!inviter) throw errors.notFound();
  let status: InviteStatus;
  if (!viewerId) status = "login_required";
  else if (viewerId === inviter.id) status = "self";
  else status = (await areFriends(getDb(), viewerId, inviter.id)) ? "friends" : "available";
  return { inviter: toUserRef(inviter), status };
}

export async function acceptInvite(token: string, viewerId: string): Promise<UserRef> {
  const inviter = await inviterByToken(token);
  if (!inviter) throw errors.notFound();
  if (inviter.id === viewerId) throw errors.rule(msg.inviteSelf);
  await getDb().transaction(async (tx) => {
    // befriend() is idempotent and clears any pending requests between the two (FR-040)
    await befriend(tx, viewerId, inviter.id);
  });
  return toUserRef(inviter);
}
