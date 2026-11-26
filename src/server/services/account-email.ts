import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { errors } from "../http/errors";
import { msg } from "@/lib/messages";
import { pgError } from "./auth";
import { checkCode, claimCode, issueCode } from "./email-codes";

// 005 US4 — research R7; contracts/api.md › Email của tôi. Only the signed-in owner reaches these.

/** POST /api/me/email/start — `email` already normalized and validated. */
export async function startEmailChange(userId: string, email: string, ip: string): Promise<{ ticket: string }> {
  const db = getDb();
  const [me] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId));
  if (me?.email === email) throw errors.validation(msg.emailSameAsCurrent, { email: msg.emailSameAsCurrent });
  const [owner] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  return issueCode({
    purpose: "change_email",
    email,
    ip,
    userId,
    delivery: owner ? "email_taken" : "code", // R4: never confirm another account uses it
  });
}

/** POST /api/me/email/verify — the new e-mail replaces the old one only now (FR-E14). */
export async function verifyEmailChange(userId: string, ticket: string, code: string): Promise<{ email: string }> {
  await checkCode({ ticket, code, purpose: "change_email", userId });
  try {
    return await getDb().transaction(async (tx) => {
      const row = await claimCode(tx, ticket);
      if (row.userId !== userId) throw errors.gone(msg.codeExpired);
      await tx
        .update(schema.users)
        .set({ email: row.email, emailVerifiedAt: new Date() }) // data-model.md › users.email, users.email_verified_at
        .where(eq(schema.users.id, userId));
      return { email: row.email };
    });
  } catch (err) {
    const { code: pg, constraint } = pgError(err);
    if (pg === "23505" && constraint === "users_email_unique") throw errors.conflict(msg.emailUnavailable);
    throw err;
  }
}
