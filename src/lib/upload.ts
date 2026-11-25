// Browser upload: presign → PUT straight to R2 with progress → complete (research.md R6).
import { api, ApiError } from "./api-client";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, msg } from "./messages";
import type { PhotoRef } from "./types";

function guessType(file: Blob & { name?: string }): string {
  if (file.type) return file.type;
  const name = (file.name ?? "").toLowerCase();
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  return "";
}

/** Client-side pre-check so the user gets instant feedback; the server re-checks by content. */
export function precheck(file: Blob & { name?: string }): string | null {
  const type = guessType(file);
  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(type)) return msg.photoUnsupported;
  if (file.size > MAX_PHOTO_BYTES) return msg.photoTooLarge;
  return null;
}

function putWithProgress(url: string, file: Blob, contentType: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, "UPLOAD", msg.network)));
    xhr.onerror = () => reject(new ApiError(0, "NETWORK", msg.network));
    xhr.send(file);
  });
}

export async function uploadPhoto(file: Blob & { name?: string }, onProgress: (p: number) => void): Promise<PhotoRef> {
  const problem = precheck(file);
  if (problem) throw new ApiError(400, "VALIDATION", problem);
  const contentType = guessType(file);
  const { photoId, upload } = await api<{ photoId: string; upload: { url: string } }>("/api/photos", {
    body: { contentType, size: file.size },
  });
  await putWithProgress(upload.url, file, contentType, (p) => onProgress(Math.min(p, 95)));
  const { photo } = await api<{ photo: PhotoRef }>(`/api/photos/${photoId}/complete`, { method: "POST" });
  onProgress(100);
  return photo;
}

/** Runs async jobs with at most `limit` in flight (3 parallel uploads). */
export function createLimiter(limit = 3) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(job: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await job();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
