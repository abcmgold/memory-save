import "server-only";
import { and, eq, or } from "drizzle-orm";
import { schema, type DbOrTx } from "../db/client";

/** data-model.md › friendships: one row per pair with user_a_id < user_b_id. */
export function orderedPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

export async function areFriends(db: DbOrTx, x: string, y: string): Promise<boolean> {
  if (x === y) return false;
  const [a, b] = orderedPair(x, y);
  const rows = await db
    .select({ a: schema.friendships.userAId })
    .from(schema.friendships)
    .where(and(eq(schema.friendships.userAId, a), eq(schema.friendships.userBId, b)))
    .limit(1);
  return rows.length > 0;
}

/** Ids of everyone currently friends with `userId`. */
export async function friendIdsOf(db: DbOrTx, userId: string): Promise<string[]> {
  const rows = await db
    .select({ a: schema.friendships.userAId, b: schema.friendships.userBId })
    .from(schema.friendships)
    .where(or(eq(schema.friendships.userAId, userId), eq(schema.friendships.userBId, userId)));
  return rows.map((r) => (r.a === userId ? r.b : r.a));
}
