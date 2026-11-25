import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { errors } from "../http/errors";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, MAX_UNATTACHED_PHOTOS, msg } from "@/lib/messages";
import { allPhotoKeys, getPhotoStore, photoKey, type PhotoVariant, type PresignedPut } from "../storage/photo-store";
import { contentTypeFor, processImage, UnsupportedImageError } from "../storage/image-processing";
import { canViewPhoto } from "../domain/access";
import { areFriends } from "./relations";

// research.md R5–R6 ; data-model.md › photos (status, bytes, format, width, height)

export type PhotoRef = { id: string; width: number; height: number; thumbUrl: string; displayUrl: string };

const PUT_EXPIRES_SEC = 600;
const GET_EXPIRES_SEC = 60;

export function toPhotoRef(p: { id: string; width: number | null; height: number | null }): PhotoRef {
  return {
    id: p.id,
    width: p.width ?? 0,
    height: p.height ?? 0,
    thumbUrl: `/api/photos/${p.id}/thumb`,
    displayUrl: `/api/photos/${p.id}/display`,
  };
}

export async function requestUpload(
  userId: string,
  input: { contentType: string; size: number },
): Promise<{ photoId: string; upload: PresignedPut }> {
  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(input.contentType)) throw errors.unsupportedType();
  if (input.size > MAX_PHOTO_BYTES) throw errors.tooLarge();
  const db = getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.photos)
    .where(and(eq(schema.photos.uploaderId, userId), inArray(schema.photos.status, ["uploading", "pending"])));
  if (n >= MAX_UNATTACHED_PHOTOS) throw errors.rule(msg.tooManyUnattached);

  const [row] = await db
    .insert(schema.photos)
    .values({ uploaderId: userId, status: "uploading", contentType: input.contentType, bytes: input.size })
    .returning({ id: schema.photos.id });
  const upload = await getPhotoStore().presignPut(photoKey(row.id, "original"), {
    contentType: input.contentType,
    contentLength: input.size,
    expiresInSec: PUT_EXPIRES_SEC,
  });
  return { photoId: row.id, upload };
}

async function discard(photoId: string): Promise<void> {
  await getDb().delete(schema.photos).where(eq(schema.photos.id, photoId));
  await getPhotoStore().delete(allPhotoKeys(photoId));
}

/** Verifies the uploaded object by content, creates derived images, marks the photo `pending`. */
export async function completeUpload(userId: string, photoId: string): Promise<PhotoRef> {
  const db = getDb();
  const [photo] = await db
    .select()
    .from(schema.photos)
    .where(and(eq(schema.photos.id, photoId), eq(schema.photos.uploaderId, userId)));
  if (!photo || photo.status === "attached") throw errors.notFound();
  if (photo.status === "pending") return toPhotoRef(photo); // idempotent retry

  const store = getPhotoStore();
  const key = photoKey(photoId, "original");
  const head = await store.head(key);
  if (!head) throw errors.rule(msg.photoNotUploaded);
  if (head.size > MAX_PHOTO_BYTES || head.size !== photo.bytes) {
    await discard(photoId);
    throw errors.tooLarge();
  }
  const original = await store.get(key);
  if (!original) throw errors.rule(msg.photoNotUploaded);

  let processed;
  try {
    processed = await processImage(original);
  } catch (err) {
    if (err instanceof UnsupportedImageError) {
      await discard(photoId);
      throw errors.unsupportedType();
    }
    throw err;
  }
  await store.put(photoKey(photoId, "display"), processed.display, "image/webp");
  await store.put(photoKey(photoId, "thumb"), processed.thumb, "image/webp");

  const [updated] = await db
    .update(schema.photos)
    .set({
      status: "pending",
      format: processed.format,
      width: processed.width,
      height: processed.height,
      bytes: head.size,
    })
    .where(eq(schema.photos.id, photoId))
    .returning();
  return toPhotoRef(updated);
}

/** Deletes a photo that is not attached to an entry (uploader only). */
export async function deleteUnattached(userId: string, photoId: string): Promise<void> {
  const [photo] = await getDb()
    .select({ status: schema.photos.status })
    .from(schema.photos)
    .where(and(eq(schema.photos.id, photoId), eq(schema.photos.uploaderId, userId)));
  if (!photo || photo.status === "attached") throw errors.notFound();
  await discard(photoId);
}

/** Access check, then a short-lived signed URL (research.md R5). Any denial is a 404. */
export async function signedVariantUrl(viewerId: string, photoId: string, variant: PhotoVariant): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({
      uploaderId: schema.photos.uploaderId,
      status: schema.photos.status,
      format: schema.photos.format,
      entryId: schema.photos.entryId,
      ownerId: schema.entries.ownerId,
    })
    .from(schema.photos)
    .leftJoin(schema.entries, eq(schema.entries.id, schema.photos.entryId))
    .where(eq(schema.photos.id, photoId));
  if (!row || row.status === "uploading" || !row.format) throw errors.notFound();

  let entryFacts = null;
  if (row.status === "attached" && row.entryId && row.ownerId) {
    const isOwner = row.ownerId === viewerId;
    const inAudience = isOwner
      ? false
      : (
          await db
            .select({ u: schema.entryAudience.userId })
            .from(schema.entryAudience)
            .where(and(eq(schema.entryAudience.entryId, row.entryId), eq(schema.entryAudience.userId, viewerId)))
            .limit(1)
        ).length > 0;
    const friends = isOwner || !inAudience ? false : await areFriends(db, viewerId, row.ownerId);
    entryFacts = { viewerId, ownerId: row.ownerId, inAudience, areFriends: friends };
  }
  const allowed = canViewPhoto({ viewerId, uploaderId: row.uploaderId, status: row.status, entry: entryFacts });
  if (!allowed) throw errors.notFound();

  const contentType = variant === "original" ? contentTypeFor(row.format) : "image/webp";
  return getPhotoStore().presignGet(photoKey(photoId, variant), { expiresInSec: GET_EXPIRES_SEC, contentType });
}
