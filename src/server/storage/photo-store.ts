import "server-only";
import { isLocalMode } from "../env";

export type PhotoVariant = "original" | "display" | "thumb";

export type PresignedPut = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
};

/** Object storage for photos (Cloudflare R2 in production, in-memory in tests). research.md R5–R6 */
export interface PhotoStore {
  /** Signed PUT URL that only accepts exactly this Content-Type and Content-Length. */
  presignPut(key: string, opts: { contentType: string; contentLength: number; expiresInSec: number }): Promise<PresignedPut>;
  /** Short-lived signed GET URL. */
  presignGet(key: string, opts: { expiresInSec: number; contentType?: string }): Promise<string>;
  head(key: string): Promise<{ size: number; contentType?: string } | null>;
  get(key: string): Promise<Buffer | null>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(keys: string[]): Promise<void>;
  /** Lists keys under a prefix (used by cleanup and backup). */
  list(prefix: string): Promise<string[]>;
}

export function photoKey(photoId: string, variant: PhotoVariant): string {
  switch (variant) {
    case "original":
      return `photos/${photoId}/original`;
    case "display":
      return `photos/${photoId}/display.webp`;
    case "thumb":
      return `photos/${photoId}/thumb.webp`;
  }
}

export function allPhotoKeys(photoId: string): string[] {
  return [photoKey(photoId, "original"), photoKey(photoId, "display"), photoKey(photoId, "thumb")];
}

const globalForStore = globalThis as unknown as { __msPhotoStore?: PhotoStore; __msTestPhotoStore?: PhotoStore };

export function getPhotoStore(): PhotoStore {
  if (globalForStore.__msTestPhotoStore) return globalForStore.__msTestPhotoStore;
  if (!globalForStore.__msPhotoStore) {
    // Lazy imports keep the AWS SDK out of code paths (and tests) that never touch R2.
    /* eslint-disable @typescript-eslint/no-require-imports */
    if (isLocalMode()) {
      const { LocalPhotoStore } = require("./local-photo-store") as typeof import("./local-photo-store");
      globalForStore.__msPhotoStore = new LocalPhotoStore();
    } else {
      const { R2PhotoStore } = require("./r2-photo-store") as typeof import("./r2-photo-store");
      globalForStore.__msPhotoStore = new R2PhotoStore();
    }
    /* eslint-enable @typescript-eslint/no-require-imports */
  }
  return globalForStore.__msPhotoStore;
}

export function setPhotoStoreForTests(store: PhotoStore | null): void {
  globalForStore.__msTestPhotoStore = store ?? undefined;
}
