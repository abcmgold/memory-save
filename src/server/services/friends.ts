import "server-only";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { getDb, schema, type DbOrTx } from "../db/client";
import { errors } from "../http/errors";
import { msg } from "@/lib/messages";
import type { UserRef } from "@/lib/types";
import { normalizeHandle } from "../domain/handle";
import { toUserRef } from "./auth";
import { areFriends, friendIdsOf, orderedPair } from "./relations";

// data-model.md › friend_requests (from_user_id, to_user_id), friendships (user_a_id < user_b_id)

const FR = schema.friendRequests;
const F = schema.friendships;

export type RequestResult = { status: "pending" | "friends"; created: boolean };

async function usersByIds(db: DbOrTx, ids: string[]): Promise<UserRef[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: schema.users.id, handle: schema.users.handle, displayName: schema.users.displayName })
    .from(schema.users)
    .where(inArray(schema.users.id, ids));
  return rows.map(toUserRef).sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));
}

export async function countIncomingRequests(userId: string): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(FR).where(eq(FR.toUserId, userId));
  return row?.n ?? 0;
}

export async function listFriends(userId: string): Promise<UserRef[]> {
  const db = getDb();
  return usersByIds(db, await friendIdsOf(db, userId));
}

export async function friendsOverview(userId: string) {
  const db = getDb();
  const [friendIds, incoming, outgoing] = await Promise.all([
    friendIdsOf(db, userId),
    db.select({ id: FR.fromUserId }).from(FR).where(eq(FR.toUserId, userId)),
    db.select({ id: FR.toUserId }).from(FR).where(eq(FR.fromUserId, userId)),
  ]);
  return {
    friends: await usersByIds(db, friendIds),
    incoming: await usersByIds(db, incoming.map((r) => r.id)),
    outgoing: await usersByIds(db, outgoing.map((r) => r.id)),
  };
}

export async function befriend(tx: DbOrTx, x: string, y: string): Promise<void> {
  const [a, b] = orderedPair(x, y);
  await tx.insert(F).values({ userAId: a, userBId: b }).onConflictDoNothing();
  await tx
    .delete(FR)
    .where(or(and(eq(FR.fromUserId, x), eq(FR.toUserId, y)), and(eq(FR.fromUserId, y), eq(FR.toUserId, x))));
}

/** FR-022/FR-023: invite by exact public handle; mutual invites become friends at once; no duplicates. */
export async function sendRequest(userId: string, rawHandle: string): Promise<RequestResult> {
  const handle = normalizeHandle(rawHandle);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [target] = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, handle));
    if (!target) throw errors.rule(msg.userNotFound, { username: msg.userNotFound });
    if (target.id === userId) throw errors.rule(msg.cannotFriendSelf, { username: msg.cannotFriendSelf });
    if (await areFriends(tx, userId, target.id)) return { status: "friends", created: false };

    const reverse = await tx
      .select({ f: FR.fromUserId })
      .from(FR)
      .where(and(eq(FR.fromUserId, target.id), eq(FR.toUserId, userId)));
    if (reverse.length > 0) {
      await befriend(tx, userId, target.id);
      return { status: "friends", created: false };
    }
    const inserted = await tx
      .insert(FR)
      .values({ fromUserId: userId, toUserId: target.id })
      .onConflictDoNothing()
      .returning({ f: FR.fromUserId });
    return { status: "pending", created: inserted.length > 0 };
  });
}

export async function acceptRequest(userId: string, fromUserId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    const removed = await tx
      .delete(FR)
      .where(and(eq(FR.fromUserId, fromUserId), eq(FR.toUserId, userId)))
      .returning({ f: FR.fromUserId });
    if (removed.length === 0) throw errors.notFound();
    await befriend(tx, userId, fromUserId);
  });
}

export async function declineRequest(userId: string, fromUserId: string): Promise<void> {
  await getDb().delete(FR).where(and(eq(FR.fromUserId, fromUserId), eq(FR.toUserId, userId)));
}

export async function cancelRequest(userId: string, toUserId: string): Promise<void> {
  await getDb().delete(FR).where(and(eq(FR.fromUserId, userId), eq(FR.toUserId, toUserId)));
}

/**
 * Removes the friendship AND every audience row between the two people, both directions,
 * in one transaction (FR-032, constitution II).
 */
export async function unfriend(userId: string, otherId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [a, b] = orderedPair(userId, otherId);
    const removed = await tx
      .delete(F)
      .where(and(eq(F.userAId, a), eq(F.userBId, b)))
      .returning({ a: F.userAId });
    if (removed.length === 0) throw errors.notFound();
    await revokeBetween(tx, userId, otherId);
    await revokeBetween(tx, otherId, userId);
  });
}

/** Deletes entry_audience rows that let `viewerId` see entries owned by `ownerId`. */
async function revokeBetween(tx: DbOrTx, ownerId: string, viewerId: string): Promise<void> {
  const owned = tx.select({ id: schema.entries.id }).from(schema.entries).where(eq(schema.entries.ownerId, ownerId));
  await tx
    .delete(schema.entryAudience)
    .where(and(eq(schema.entryAudience.userId, viewerId), inArray(schema.entryAudience.entryId, owned)));
}
