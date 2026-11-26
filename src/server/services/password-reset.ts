import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { errors } from "../http/errors";
import { msg } from "@/lib/messages";
import type { UserRef } from "@/lib/types";
import { hashPassword, toUserRef } from "./auth";
import { checkCode, claimCode, issueCode } from "./email-codes";
import { deleteUserSessions } from "./sessions";

// 005 US3 — research R4, R6; contracts/api.md › Quên mật khẩu

/**
 * POST /api/auth/password-reset/start — always the same answer. Only an account with a password and this verified
 * e-mail gets a real code; a Google-only account gets "use Google"; an unknown address gets nothing (R4).
 */
export async function startReset(email: string, ip: string): Promise<{ ticket: string }> {
  const [user] = await getDb()
    .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  return issueCode({
    purpose: "reset_password",
    email,
    ip,
    userId: user?.passwordHash ? user.id : null,
    delivery: !user ? "none" : user.passwordHash ? "code" : "google_account",
  });
}

/** POST /api/auth/password-reset/verify — new password, every old session signed out (FR-E12). */
export async function verifyReset(ticket: string, code: string, password: string): Promise<UserRef> {
  const checked = await checkCode({ ticket, code, purpose: "reset_password" });
  if (!checked.userId) throw errors.gone(msg.codeExpired); // never reachable with a decoy, kept as a guard
  const passwordHash = await hashPassword(password);
  return getDb().transaction(async (tx) => {
    const row = await claimCode(tx, ticket);
    if (!row.userId) throw errors.gone(msg.codeExpired);
    const [user] = await tx
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, row.userId))
      .returning();
    if (!user?.username) throw errors.gone(msg.codeExpired);
    await deleteUserSessions(user.id, tx);
    await tx.delete(schema.loginAttempts).where(eq(schema.loginAttempts.username, user.username));
    return toUserRef(user);
  });
}
