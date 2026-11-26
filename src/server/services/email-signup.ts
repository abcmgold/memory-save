import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { errors } from "../http/errors";
import { msg } from "@/lib/messages";
import { safeNext } from "@/lib/safe-next";
import type { UserRef } from "@/lib/types";
import { hashPassword, insertUser, pgError, toUserRef } from "./auth";
import { checkCode, claimCode, issueCode } from "./email-codes";

// 005 US1 — research R5; contracts/api.md › Đăng ký. The account exists only after the e-mail code is entered.

export type SignupStart = { username: string; password: string; displayName: string; email: string; next?: string | null };

/** POST /api/auth/register/start — inputs already validated and normalized by SignupStartBody. */
export async function startSignup(input: SignupStart, ip: string): Promise<{ ticket: string }> {
  const db = getDb();
  const [taken] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, input.username));
  if (taken) throw errors.conflict(msg.usernameTaken, { username: msg.usernameTaken });

  const [owner] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email));
  return issueCode({
    purpose: "signup",
    email: input.email,
    ip,
    // An address that already has an account gets a "you already have an account" mail and no usable code (R4).
    delivery: owner ? "email_taken" : "code",
    payload: {
      username: input.username,
      passwordHash: await hashPassword(input.password), // never the plain password
      displayName: input.displayName,
      next: safeNext(input.next),
    },
  });
}

/** POST /api/auth/register/verify — creates the account with a verified e-mail. */
export async function verifySignup(ticket: string, code: string): Promise<{ user: UserRef; next: string | null }> {
  await checkCode({ ticket, code, purpose: "signup" });
  try {
    return await getDb().transaction(async (tx) => {
      const row = await claimCode(tx, ticket);
      const p = row.payload;
      if (!p) throw errors.gone(msg.codeExpired);
      const user = await insertUser(
        {
          username: p.username,
          passwordHash: p.passwordHash,
          displayName: p.displayName,
          email: row.email, // data-model.md › users.email — only ever written once verified
          emailVerifiedAt: new Date(),
        },
        tx,
      );
      return { user: toUserRef(user), next: safeNext(p.next) };
    });
  } catch (err) {
    const { code: pg, constraint } = pgError(err);
    if (pg === "23505" && (constraint === "users_username_unique" || constraint === "users_email_unique")) {
      throw errors.conflict(msg.emailTakenOnSignup);
    }
    throw err;
  }
}
