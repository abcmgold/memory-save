import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { uploadPhoto } from "../helpers/photos";
import { setPhotoStoreForTests, photoKey } from "@/server/storage/photo-store";
import { getDb, schema } from "@/server/db/client";
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

  it("removes expired pending Google sign-ups and keeps fresh ones (002)", async () => {
    const db = getDb();
    const minute = 60_000;
    await db.insert(schema.pendingGoogleSignups).values([
      { tokenHash: "old", googleSub: "s1", googleEmail: "a@x.com", suggestedName: "A", expiresAt: new Date(Date.now() - minute) },
      { tokenHash: "new", googleSub: "s2", googleEmail: "b@x.com", suggestedName: "B", expiresAt: new Date(Date.now() + 5 * minute) },
    ]);
    const res = await run(process.env.CRON_SECRET);
    expect(res.status).toBe(200);
    expect(res.body.removedPendingGoogleSignups).toBe(1);
    const left = await db.select({ t: schema.pendingGoogleSignups.tokenHash }).from(schema.pendingGoogleSignups);
    expect(left).toEqual([{ t: "new" }]);
  });

  it("removes long-expired e-mail codes and sends older than an hour (005)", async () => {
    const db = getDb();
    const minute = 60_000;
    const at = (m: number) => new Date(Date.now() + m * minute);
    const row = { purpose: "signup" as const, email: "a@x.com", codeHash: "c", delivery: "code" as const };
    await db.insert(schema.emailCodes).values([
      { ...row, ticketHash: "old", sentAt: at(-80), expiresAt: at(-70) },
      { ...row, ticketHash: "recent", sentAt: at(-15), expiresAt: at(-5) }, // still revivable by "resend"
      { ...row, ticketHash: "live", sentAt: at(0), expiresAt: at(10) },
    ]);
    await db.insert(schema.emailSends).values([
      { email: "a@x.com", ip: "unknown", sentAt: at(-61) },
      { email: "a@x.com", ip: "unknown", sentAt: at(-5) },
    ]);
    const res = await run(process.env.CRON_SECRET);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ removedEmailCodes: 1, removedEmailSends: 1 });
    const left = (await db.select({ t: schema.emailCodes.ticketHash }).from(schema.emailCodes)).map((r) => r.t).sort();
    expect(left).toEqual(["live", "recent"]);
  });
});
