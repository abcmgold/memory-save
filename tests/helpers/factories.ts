import { hashPassword, insertUser, toUserRef, type UserRef } from "@/server/services/auth";
import { createSession, SESSION_COOKIE } from "@/server/services/sessions";
import { getDb, schema } from "@/server/db/client";

export type TestUser = UserRef & { cookie: string };

/** A password account (password "matkhau123"), signed in. Pass `email` to give it a verified e-mail (005). */
export async function createUser(username: string, displayName = "Người dùng thử", email?: string): Promise<TestUser> {
  const user = toUserRef(
    await insertUser({
      username,
      passwordHash: await hashPassword("matkhau123"),
      displayName,
      ...(email ? { email, emailVerifiedAt: new Date() } : {}),
    }),
  );
  const { token } = await createSession(user.id);
  return { ...user, cookie: `${SESSION_COOKIE}=${token}` };
}

/** Inserts a friendship directly (canonical order user_a_id < user_b_id). */
export async function makeFriends(a: { id: string }, b: { id: string }): Promise<void> {
  const [x, y] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  await getDb().insert(schema.friendships).values({ userAId: x, userBId: y }).onConflictDoNothing();
}
