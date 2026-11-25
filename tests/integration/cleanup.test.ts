import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { uploadPhoto } from "../helpers/photos";
import { setPhotoStoreForTests, photoKey } from "@/server/storage/photo-store";
import { schema } from "@/server/db/client";
import { POST as createEntry } from "@/app/api/entries/route";
import { GET as cron } from "@/app/api/cron/cleanup/route";

describe("daily cleanup (contracts/api.md › Cron; data-model.md photo lifecycle)", () => {
  let store: MemoryPhotoStore;
  let an: TestUser;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    store = new MemoryPhotoStore();
    setPhotoStoreForTests(store);
    an = await createUser("an_nguyen");
  });
  afterAll(async () => {
    setPhotoStoreForTests(null);
    await closeTestDb();
  });

  const run = (secret?: string) =>
    call(cron, "GET", "/api/cron/cleanup", {
      origin: null,
      headers: secret ? { authorization: `Bearer ${secret}` } : {},
    });

  it("rejects calls without the cron secret", async () => {
    expect((await run()).status).toBe(401);
    expect((await run("wrong-secret-0000000000")).status).toBe(401);
  });

  it("removes stale unattached photos, orphan objects, expired sessions and old login attempts", async () => {
    const db = await setupTestDb();
    const stale = await uploadPhoto(store, an.cookie);
    const fresh = await uploadPhoto(store, an.cookie);
    const kept = await uploadPhoto(store, an.cookie);
    await call(createEntry, "POST", "/api/entries", { cookie: an.cookie, body: { title: "x", photoIds: [kept] } });
    await db
      .update(schema.photos)
      .set({ createdAt: sql`now() - interval '25 hours'` })
      .where(eq(schema.photos.id, stale));
    await db.update(schema.photos).set({ createdAt: sql`now() - interval '25 hours'` }).where(eq(schema.photos.id, kept));
    await store.put("photos/00000000-0000-4000-8000-000000000000/original", Buffer.from("orphan"), "image/jpeg");
    await db.insert(schema.sessions).values({ tokenHash: "old", userId: an.id, expiresAt: new Date(Date.now() - 1000) });
    await db.insert(schema.loginAttempts).values({ username: "x", attemptedAt: new Date(Date.now() - 60 * 60_000) });

    const r = await run(process.env.CRON_SECRET);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ removedPhotos: 1, removedOrphanObjects: 1, removedSessions: 1, removedLoginAttempts: 1 });

    const ids = (await db.select({ id: schema.photos.id }).from(schema.photos)).map((p) => p.id).sort();
    expect(ids).toEqual([fresh, kept].sort());
    expect(store.objects.has(photoKey(stale, "original"))).toBe(false);
    expect(store.objects.has(photoKey(kept, "display"))).toBe(true);
    expect(store.objects.has(photoKey(fresh, "thumb"))).toBe(true);
  });
});
