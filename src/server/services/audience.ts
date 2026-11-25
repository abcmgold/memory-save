import "server-only";
import { eq, inArray } from "drizzle-orm";
import { schema, type DbOrTx } from "../db/client";
import { errors } from "../http/errors";
import type { Audience, AudienceInput, AudienceMode } from "@/lib/types";
import { resolveAudience } from "../domain/audience";
import { toUserRef } from "./auth";
import { friendIdsOf } from "./relations";

/**
 * Replaces an entry's audience (data-model.md › entry_audience; entries.audience_mode) and optionally
 * remembers the choice as the owner's next default (users.last_audience, FR-027). Runs inside the caller's transaction.
 */
export async function applyAudience(
  tx: DbOrTx,
  ownerId: string,
  entryId: string,
  input: AudienceInput,
  opts: { rememberChoice: boolean },
): Promise<void> {
  const friendIds = await friendIdsOf(tx, ownerId);
  const resolved = resolveAudience(input, friendIds);
  if (!resolved.ok) throw errors.rule(resolved.error, { audience: resolved.error });

  await tx.delete(schema.entryAudience).where(eq(schema.entryAudience.entryId, entryId));
  if (resolved.userIds.length > 0) {
    await tx.insert(schema.entryAudience).values(resolved.userIds.map((userId) => ({ entryId, userId })));
  }
  await tx.update(schema.entries).set({ audienceMode: resolved.mode }).where(eq(schema.entries.id, entryId));

  if (opts.rememberChoice) {
    await tx
      .update(schema.users)
      .set({ lastAudience: { mode: resolved.mode, userIds: resolved.mode === "custom" ? resolved.userIds : [] } })
      .where(eq(schema.users.id, ownerId));
  }
}

export async function loadAudiences(
  db: DbOrTx,
  entries: { id: string; mode: AudienceMode }[],
): Promise<Map<string, Audience>> {
  const map = new Map<string, Audience>(entries.map((e) => [e.id, { mode: e.mode, users: [] }]));
  if (entries.length === 0) return map;
  const rows = await db
    .select({
      entryId: schema.entryAudience.entryId,
      id: schema.users.id,
      handle: schema.users.handle,
      displayName: schema.users.displayName,
    })
    .from(schema.entryAudience)
    .innerJoin(schema.users, eq(schema.users.id, schema.entryAudience.userId))
    .where(inArray(schema.entryAudience.entryId, entries.map((e) => e.id)));
  for (const r of rows) map.get(r.entryId)?.users.push(toUserRef(r));
  return map;
}
