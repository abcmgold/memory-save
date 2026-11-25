import sharp from "sharp";
import { expect } from "vitest";
import { call } from "./request";
import type { MemoryPhotoStore } from "./memory-photo-store";
import { POST as presign } from "@/app/api/photos/route";
import { POST as complete } from "@/app/api/photos/[id]/complete/route";

/** A real JPEG; `orientation` 6 means "rotate 90° clockwise to display". Includes EXIF to verify stripping. */
export async function makeJpeg(width = 200, height = 100, orientation?: number): Promise<Buffer> {
  let img = sharp({ create: { width, height, channels: 3, background: { r: 230, g: 120, b: 80 } } }).jpeg();
  img = img.withExif({ IFD0: { Make: "TestCam", Model: "MemorySave" } });
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
}

export async function makePng(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 64, channels: 4, background: "#c8b6ff" } }).png().toBuffer();
}

/** Full upload flow: presign → (simulated) browser PUT → complete. Returns the photo id. */
export async function uploadPhoto(
  store: MemoryPhotoStore,
  cookie: string,
  body?: Buffer,
  contentType = "image/jpeg",
): Promise<string> {
  const buf = body ?? (await makeJpeg());
  const p = await call(presign, "POST", "/api/photos", { cookie, body: { contentType, size: buf.length } });
  expect(p.status).toBe(201);
  store.simulateClientPut(p.body.upload.url, buf, contentType);
  const c = await call(complete, "POST", `/api/photos/${p.body.photoId}/complete`, {
    cookie,
    params: { id: p.body.photoId },
  });
  expect(c.status).toBe(200);
  return p.body.photoId as string;
}
