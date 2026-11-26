import "server-only";
import { and, inArray, isNull, lt, or, eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { allPhotoKeys, getPhotoStore } from "../storage/photo-store";
import { deleteExpiredSessions } from "./sessions";
import { deleteOldAttempts } from "./rate-limit";
import { deleteExpiredCodes, deleteOldSends } from "./email-codes";

// data-model.md › photos lifecycle: uploading|pending older than 24h → deleted; orphan objects → deleted.
const STALE_HOURS = 24;

export async function runCleanup() {
  const db = getDb();
  const store = getPhotoStore();

  const stale = await db
    .delete(schema.photos)
    .where(
      or(
        and(
          inArray(schema.photos.status, ["uploading", "pending"]),
          lt(schema.photos.createdAt, sql`now() - make_interval(hours => ${STALE_HOURS})`),
        ),
        // attached photos whose entry vanished (FK set null) are orphans too
        and(eq(schema.photos.status, "attached"), isNull(schema.photos.entryId)),
      ),
    )
    .returning({ id: schema.photos.id });
  if (stale.length) await store.delete(stale.flatMap((p) => allPhotoKeys(p.id)));

  // Objects with no matching row (e.g. an R2 delete that failed after a DB commit)
  const keys = await store.list("photos/");
  const idsInStore = [...new Set(keys.map((k) => k.split("/")[1]).filter(Boolean))];
  let orphanIds: string[] = [];
  if (idsInStore.length) {
    const uuidLike = idsInStore.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    const known = new Set<string>();
    for (let i = 0; i < uuidLike.length; i += 500) {
      const chunk = uuidLike.slice(i, i + 500);
      const rows = await db.select({ id: schema.photos.id }).from(schema.photos).where(inArray(schema.photos.id, chunk));
      rows.forEach((r) => known.add(r.id));
    }
    orphanIds = idsInStore.filter((id) => !known.has(id));
    const orphanKeys = keys.filter((k) => orphanIds.includes(k.split("/")[1]));
    if (orphanKeys.length) await store.delete(orphanKeys);
  }

  return {
    removedPhotos: stale.length,
    removedOrphanObjects: orphanIds.length,
    removedSessions: await deleteExpiredSessions(),
    removedLoginAttempts: await deleteOldAttempts(),
    removedPendingGoogleSignups: (
      await db
        .delete(schema.pendingGoogleSignups)
        .where(lt(schema.pendingGoogleSignups.expiresAt, new Date()))
        .returning({ t: schema.pendingGoogleSignups.tokenHash })
    ).length, // 002 data-model.md › pending_google_signups lifecycle
    removedEmailCodes: await deleteExpiredCodes(), // 005 data-model.md › email_codes lifecycle
    removedEmailSends: await deleteOldSends(), // 005 data-model.md › email_sends

  };
}
