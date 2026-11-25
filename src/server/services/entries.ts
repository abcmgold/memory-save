import "server-only";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema, type DbOrTx } from "../db/client";
import { errors } from "../http/errors";
import { msg } from "@/lib/messages";
import type { Audience, AudienceInput, Entry, Page, UserRef } from "@/lib/types";
import { getAppTimeZone } from "../env";
import { dbToLocal, localToDb, nowLocal } from "../domain/clock";
import { validateEntry } from "../domain/entry-rules";
import { canEditEntry, canViewEntry } from "../domain/access";
import { dateUpperBound, decodeCursor, encodeCursor, PAGE_SIZE } from "../domain/timeline";
import { allPhotoKeys, getPhotoStore } from "../storage/photo-store";
import { toPhotoRef } from "./photos";
import { toUserRef } from "./auth";
import { areFriends } from "./relations";
import { applyAudience, loadAudiences } from "./audience";

// data-model.md › entries, photos (entry_id, position, status) ; contracts/api.md › Bài nhật ký

export type EntryWrite = {
  title?: string | null;
  body?: string | null;
  eventAt?: string | null;
  kind?: "journal" | "quick";
  photoIds?: string[];
  audience?: AudienceInput;
};

const E = schema.entries;

const entryColumns = {
  id: E.id,
  ownerId: E.ownerId,
  title: E.title,
  body: E.body,
  eventAt: E.eventAt,
  kind: E.kind,
  audienceMode: E.audienceMode,
  createdAt: E.createdAt,
  updatedAt: E.updatedAt,
  createdRaw: sql<string>`${E.createdAt}::text`,
  authorHandle: schema.users.handle,
  authorDisplayName: schema.users.displayName,
};

type EntryRowX = {
  id: string;
  ownerId: string;
  title: string | null;
  body: string | null;
  eventAt: string;
  kind: "journal" | "quick";
  audienceMode: "private" | "friends" | "custom";
  createdAt: Date;
  updatedAt: Date;
  createdRaw: string;
  authorHandle: string;
  authorDisplayName: string | null;
};

function throwValidation(fields: Record<string, string>): never {
  throw errors.validation(fields._ ?? msg.validation, fields);
}

function unique(ids: string[]): string[] {
  const set = new Set(ids);
  if (set.size !== ids.length) throwValidation({ photoIds: msg.photoNotAttachable });
  return ids;
}

/** Attaches the uploader's own `pending` photos in the given order (others → 422). */
async function attachPhotos(tx: DbOrTx, userId: string, entryId: string, ids: string[], alreadyAttached: Set<string>) {
  const toAttach = ids.filter((id) => !alreadyAttached.has(id));
  if (toAttach.length > 0) {
    const found = await tx
      .select({ id: schema.photos.id })
      .from(schema.photos)
      .where(
        and(
          inArray(schema.photos.id, toAttach),
          eq(schema.photos.uploaderId, userId),
          eq(schema.photos.status, "pending"),
        ),
      );
    if (found.length !== toAttach.length) throw errors.rule(msg.photoNotAttachable, { photoIds: msg.photoNotAttachable });
  }
  for (let i = 0; i < ids.length; i++) {
    await tx
      .update(schema.photos)
      .set({ entryId, position: i, status: "attached" })
      .where(eq(schema.photos.id, ids[i]));
  }
}

async function deletePhotoFiles(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  try {
    await getPhotoStore().delete(photoIds.flatMap(allPhotoKeys));
  } catch (err) {
    // Rows are already gone; the daily cleanup removes orphaned objects (data-model.md › photos).
    console.error("[photos] object delete failed; cleanup will retry", err);
  }
}

export async function createEntry(userId: string, input: EntryWrite): Promise<Entry> {
  const kind = input.kind ?? "journal";
  const photoIds = unique(input.photoIds ?? []);
  const v = validateEntry({ ...input, kind, photoCount: photoIds.length }, nowLocal(getAppTimeZone()));
  if (!v.ok) throwValidation(v.errors);

  const db = getDb();
  const entryId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(E)
      .values({ ownerId: userId, title: v.value.title, body: v.value.body, eventAt: localToDb(v.value.eventAt), kind })
      .returning({ id: E.id });
    await attachPhotos(tx, userId, row.id, photoIds, new Set());
    await applyAudience(tx, userId, row.id, input.audience ?? { mode: "private" }, { rememberChoice: true });
    return row.id;
  });
  return getEntryForViewer(userId, entryId);
}

export async function updateEntry(userId: string, entryId: string, patch: EntryWrite): Promise<Entry> {
  const db = getDb();
  const removed = await db.transaction(async (tx) => {
    const [entry] = await tx.select().from(E).where(eq(E.id, entryId));
    if (!entry || !canEditEntry({ viewerId: userId, ownerId: entry.ownerId })) throw errors.notFound();

    const current = (
      await tx
        .select({ id: schema.photos.id })
        .from(schema.photos)
        .where(eq(schema.photos.entryId, entryId))
        .orderBy(asc(schema.photos.position))
    ).map((p) => p.id);
    const next = patch.photoIds ? unique(patch.photoIds) : current;

    const v = validateEntry(
      {
        title: patch.title !== undefined ? patch.title : entry.title,
        body: patch.body !== undefined ? patch.body : entry.body,
        eventAt: patch.eventAt ?? dbToLocal(entry.eventAt),
        kind: entry.kind,
        photoCount: next.length,
      },
      nowLocal(getAppTimeZone()),
    );
    if (!v.ok) throwValidation(v.errors);

    const nextSet = new Set(next);
    const gone = current.filter((id) => !nextSet.has(id));
    if (gone.length) await tx.delete(schema.photos).where(inArray(schema.photos.id, gone));
    await attachPhotos(tx, userId, entryId, next, new Set(current));

    await tx
      .update(E)
      .set({ title: v.value.title, body: v.value.body, eventAt: localToDb(v.value.eventAt), updatedAt: new Date() })
      .where(eq(E.id, entryId));
    if (patch.audience) await applyAudience(tx, userId, entryId, patch.audience, { rememberChoice: true });
    return gone;
  });
  await deletePhotoFiles(removed);
  return getEntryForViewer(userId, entryId);
}

export async function deleteEntry(userId: string, entryId: string): Promise<void> {
  const db = getDb();
  const photoIds = await db.transaction(async (tx) => {
    const [entry] = await tx.select({ ownerId: E.ownerId }).from(E).where(eq(E.id, entryId));
    if (!entry || !canEditEntry({ viewerId: userId, ownerId: entry.ownerId })) throw errors.notFound();
    const photos = await tx
      .delete(schema.photos)
      .where(eq(schema.photos.entryId, entryId))
      .returning({ id: schema.photos.id });
    await tx.delete(E).where(eq(E.id, entryId)); // entry_audience cascades
    return photos.map((p) => p.id);
  });
  await deletePhotoFiles(photoIds);
}

/** Returns the entry if the viewer may see it; otherwise 404 (never reveals existence). */
export async function getEntryForViewer(viewerId: string, entryId: string): Promise<Entry> {
  const db = getDb();
  const [row] = await db
    .select(entryColumns)
    .from(E)
    .innerJoin(schema.users, eq(schema.users.id, E.ownerId))
    .where(eq(E.id, entryId));
  if (!row) throw errors.notFound();
  if (row.ownerId !== viewerId) {
    const inAudience =
      (
        await db
          .select({ u: schema.entryAudience.userId })
          .from(schema.entryAudience)
          .where(and(eq(schema.entryAudience.entryId, entryId), eq(schema.entryAudience.userId, viewerId)))
          .limit(1)
      ).length > 0;
    const friends = inAudience ? await areFriends(db, viewerId, row.ownerId) : false;
    if (!canViewEntry({ viewerId, ownerId: row.ownerId, inAudience, areFriends: friends })) throw errors.notFound();
  }
  const [dto] = await toEntries(db, viewerId, [row as EntryRowX]);
  return dto;
}

export async function listMine(userId: string, opts: { cursor?: string | null; date?: string | null }): Promise<Page<Entry>> {
  const conditions = [eq(E.ownerId, userId)];
  return listPage(userId, conditions, opts);
}

export async function listPage(
  viewerId: string,
  conditions: ReturnType<typeof eq>[],
  opts: { cursor?: string | null; date?: string | null },
  join?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<Page<Entry>> {
  const db = getDb();
  const where = [...conditions];
  if (opts.date) {
    let bound: string;
    try {
      bound = dateUpperBound(opts.date);
    } catch {
      throw errors.validation();
    }
    where.push(lt(E.eventAt, localToDb(bound)));
  }
  if (opts.cursor) {
    const key = decodeCursor(opts.cursor);
    if (!key) throw errors.validation();
    where.push(
      sql`(${E.eventAt}, ${E.createdAt}, ${E.id}) < (${localToDb(key.eventAt)}::timestamp, ${key.createdAt}::timestamptz, ${key.id}::uuid)` as unknown as ReturnType<typeof eq>,
    );
  }
  let q = db.select(entryColumns).from(E).innerJoin(schema.users, eq(schema.users.id, E.ownerId)).$dynamic();
  if (join) q = join(q);
  const rows = (await q
    .where(and(...where))
    .orderBy(desc(E.eventAt), desc(E.createdAt), desc(E.id))
    .limit(PAGE_SIZE + 1)) as EntryRowX[];

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const items = await toEntries(db, viewerId, page);
  const last = page[page.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last ? encodeCursor({ eventAt: dbToLocal(last.eventAt), createdAt: last.createdRaw, id: last.id }) : null,
  };
}

async function toEntries(db: DbOrTx, viewerId: string, rows: EntryRowX[]): Promise<Entry[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const photoRows = await db
    .select({
      id: schema.photos.id,
      entryId: schema.photos.entryId,
      width: schema.photos.width,
      height: schema.photos.height,
    })
    .from(schema.photos)
    .where(and(inArray(schema.photos.entryId, ids), eq(schema.photos.status, "attached")))
    .orderBy(asc(schema.photos.position));
  const photosByEntry = new Map<string, ReturnType<typeof toPhotoRef>[]>();
  for (const p of photoRows) {
    const list = photosByEntry.get(p.entryId!) ?? [];
    list.push(toPhotoRef(p));
    photosByEntry.set(p.entryId!, list);
  }

  const owned = rows.filter((r) => r.ownerId === viewerId);
  const audiences: Map<string, Audience> = owned.length
    ? await loadAudiences(
        db,
        owned.map((r) => ({ id: r.id, mode: r.audienceMode })),
      )
    : new Map();

  return rows.map((r) => {
    const author: UserRef = toUserRef({ id: r.ownerId, handle: r.authorHandle, displayName: r.authorDisplayName });
    const isOwner = r.ownerId === viewerId;
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      eventAt: dbToLocal(r.eventAt),
      kind: r.kind,
      author,
      photos: photosByEntry.get(r.id) ?? [],
      isOwner,
      ...(isOwner ? { audience: audiences.get(r.id) ?? { mode: r.audienceMode, users: [] } } : {}),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}
