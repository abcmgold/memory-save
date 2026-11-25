import "server-only";
import { ne, sql } from "drizzle-orm";
import { schema } from "../db/client";
import type { Entry, Page } from "@/lib/types";
import { listPage } from "./entries";

const E = schema.entries;

/**
 * "Khoảnh khắc": entries shared with me by people who are STILL my friends (FR-029, FR-031 double check).
 */
export async function listShared(viewerId: string, opts: { cursor?: string | null }): Promise<Page<Entry>> {
  return listPage(
    viewerId,
    [
      ne(E.ownerId, viewerId),
      sql`exists (select 1 from ${schema.entryAudience} ea where ea.entry_id = ${E.id} and ea.user_id = ${viewerId}::uuid)` as never,
      sql`exists (select 1 from ${schema.friendships} f where f.user_a_id = least(${E.ownerId}, ${viewerId}::uuid) and f.user_b_id = greatest(${E.ownerId}, ${viewerId}::uuid))` as never,
    ],
    { cursor: opts.cursor },
  );
}
