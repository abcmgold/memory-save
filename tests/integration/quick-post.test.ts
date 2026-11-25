import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { uploadPhoto } from "../helpers/photos";
import { setPhotoStoreForTests } from "@/server/storage/photo-store";
import { POST as createEntry, GET as listEntries } from "@/app/api/entries/route";
import { nowLocal } from "@/server/domain/clock";
import { msg } from "@/lib/messages";

describe("quick post (US2, FR-020)", () => {
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

  const quick = (body: Record<string, unknown>) =>
    call(createEntry, "POST", "/api/entries", { cookie: an.cookie, body: { kind: "quick", ...body } });

  it("creates a quick post with one photo, caption as body, time = now in the app time zone", async () => {
    const before = nowLocal("Asia/Ho_Chi_Minh");
    const photo = await uploadPhoto(store, an.cookie);
    const r = await quick({ body: "Hoàng hôn ở hồ Tây", photoIds: [photo] });
    const after = nowLocal("Asia/Ho_Chi_Minh");
    expect(r.status).toBe(201);
    expect(r.body.entry).toMatchObject({ kind: "quick", title: null, body: "Hoàng hôn ở hồ Tây" });
    expect(r.body.entry.eventAt >= before && r.body.entry.eventAt <= after).toBe(true);
    expect(r.body.entry.photos).toHaveLength(1);

    const list = await call(listEntries, "GET", "/api/entries?scope=mine", { cookie: an.cookie });
    expect(list.body.items[0].id).toBe(r.body.entry.id);
  });

  it("allows an empty caption", async () => {
    const photo = await uploadPhoto(store, an.cookie);
    expect((await quick({ photoIds: [photo] })).status).toBe(201);
  });

  it("requires exactly one photo", async () => {
    const none = await quick({ body: "x", photoIds: [] });
    expect(none.status).toBe(400);
    expect(none.body.error.fields.photoIds).toBe(msg.quickNeedsOnePhoto);
    const p1 = await uploadPhoto(store, an.cookie);
    const p2 = await uploadPhoto(store, an.cookie);
    expect((await quick({ photoIds: [p1, p2] })).status).toBe(400);
  });

  it("limits the caption to 200 characters (narrows entries.body for quick posts)", async () => {
    const photo = await uploadPhoto(store, an.cookie);
    const r = await quick({ body: "a".repeat(201), photoIds: [photo] });
    expect(r.status).toBe(400);
    expect(r.body.error.fields.body).toBe(msg.captionTooLong);
  });
});
