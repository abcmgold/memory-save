import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { makeJpeg, makePng, uploadPhoto } from "../helpers/photos";
import { setPhotoStoreForTests, photoKey } from "@/server/storage/photo-store";
import { schema } from "@/server/db/client";
import { POST as presign } from "@/app/api/photos/route";
import { POST as complete } from "@/app/api/photos/[id]/complete/route";
import { DELETE as removePhoto } from "@/app/api/photos/[id]/route";
import { GET as variant } from "@/app/api/photos/[id]/[variant]/route";

describe("photos (contracts/api.md › Ảnh)", () => {
  let store: MemoryPhotoStore;
  let an: TestUser;
  let minh: TestUser;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    store = new MemoryPhotoStore();
    setPhotoStoreForTests(store);
    an = await createUser("an_nguyen");
    minh = await createUser("minh_tran");
  });
  afterAll(async () => {
    setPhotoStoreForTests(null);
    await closeTestDb();
  });

  it("requires a session", async () => {
    const r = await call(presign, "POST", "/api/photos", { body: { contentType: "image/jpeg", size: 10 } });
    expect(r.status).toBe(401);
  });

  it("rejects a declared size over 10 MB with 413 and unsupported types with 415", async () => {
    const big = await call(presign, "POST", "/api/photos", {
      cookie: an.cookie,
      body: { contentType: "image/jpeg", size: 10 * 1024 * 1024 + 1 },
    });
    expect(big.status).toBe(413);
    const gif = await call(presign, "POST", "/api/photos", { cookie: an.cookie, body: { contentType: "image/gif", size: 100 } });
    expect(gif.status).toBe(415);
  });

  it("signs the PUT for the exact Content-Length (R2 refuses a different size)", async () => {
    const p = await call(presign, "POST", "/api/photos", { cookie: an.cookie, body: { contentType: "image/jpeg", size: 100 } });
    expect(p.status).toBe(201);
    expect(() => store.simulateClientPut(p.body.upload.url, Buffer.alloc(5000), "image/jpeg")).toThrow(/Content-Length/);
  });

  it("detects the real format from content: a PDF renamed to .jpg is rejected and deleted (FR-014)", async () => {
    const fake = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer\n%%EOF");
    const p = await call(presign, "POST", "/api/photos", { cookie: an.cookie, body: { contentType: "image/jpeg", size: fake.length } });
    store.simulateClientPut(p.body.upload.url, fake, "image/jpeg");
    const c = await call(complete, "POST", "/x", { cookie: an.cookie, params: { id: p.body.photoId } });
    expect(c.status).toBe(415);
    expect(store.objects.size).toBe(0);
    const db = await setupTestDb();
    expect(await db.select().from(schema.photos)).toHaveLength(0);
  });

  it("completing before the upload arrived returns 422", async () => {
    const p = await call(presign, "POST", "/api/photos", { cookie: an.cookie, body: { contentType: "image/jpeg", size: 100 } });
    const c = await call(complete, "POST", "/x", { cookie: an.cookie, params: { id: p.body.photoId } });
    expect(c.status).toBe(422);
  });

  it("processes a JPEG: fixes orientation, creates display + thumb WebP without EXIF", async () => {
    const id = await uploadPhoto(store, an.cookie, await makeJpeg(200, 100, 6));
    const db = await setupTestDb();
    const [row] = await db.select().from(schema.photos).where(eq(schema.photos.id, id));
    expect(row).toMatchObject({ status: "pending", format: "jpeg", width: 100, height: 200 });

    const display = store.objects.get(photoKey(id, "display"))!.body;
    const meta = await sharp(display).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([100, 200]);
    expect(meta.exif).toBeUndefined();
    expect(store.objects.has(photoKey(id, "thumb"))).toBe(true);
    expect(store.objects.has(photoKey(id, "original"))).toBe(true);
  });

  it("accepts PNG", async () => {
    const id = await uploadPhoto(store, an.cookie, await makePng(), "image/png");
    const db = await setupTestDb();
    const [row] = await db.select().from(schema.photos).where(eq(schema.photos.id, id));
    expect(row.format).toBe("png");
  });

  it("only the uploader can view an unattached photo; others get 404 (FR-031)", async () => {
    const id = await uploadPhoto(store, an.cookie);
    const own = await call(variant, "GET", "/x", { cookie: an.cookie, params: { id, variant: "display" } });
    expect(own.status).toBe(302);
    expect(own.headers.get("location")).toContain(photoKey(id, "display"));
    expect(own.headers.get("cache-control")).toBe("private, no-store");

    const other = await call(variant, "GET", "/x", { cookie: minh.cookie, params: { id, variant: "display" } });
    expect(other.status).toBe(404);
    const guest = await call(variant, "GET", "/x", { params: { id, variant: "display" } });
    expect([401, 404]).toContain(guest.status);
    const badVariant = await call(variant, "GET", "/x", { cookie: an.cookie, params: { id, variant: "../../etc" } });
    expect(badVariant.status).toBe(404);
  });

  it("limits unattached photos per user to 30", async () => {
    const db = await setupTestDb();
    await db.insert(schema.photos).values(
      Array.from({ length: 30 }, () => ({ uploaderId: an.id, status: "pending" as const, contentType: "image/jpeg", bytes: 10 })),
    );
    const r = await call(presign, "POST", "/api/photos", { cookie: an.cookie, body: { contentType: "image/jpeg", size: 10 } });
    expect(r.status).toBe(422);
  });

  it("lets the uploader delete an unattached photo, nobody else", async () => {
    const id = await uploadPhoto(store, an.cookie);
    const byOther = await call(removePhoto, "DELETE", "/x", { cookie: minh.cookie, params: { id } });
    expect(byOther.status).toBe(404);
    const byOwner = await call(removePhoto, "DELETE", "/x", { cookie: an.cookie, params: { id } });
    expect(byOwner.status).toBe(204);
    expect(store.objects.size).toBe(0);
  });
});
