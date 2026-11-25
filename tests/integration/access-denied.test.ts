// SC-006: every unauthorized access to an entry or its photos is refused — constitution II & IV.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, makeFriends, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { uploadPhoto } from "../helpers/photos";
import { setPhotoStoreForTests } from "@/server/storage/photo-store";
import { schema } from "@/server/db/client";
import { POST as createEntry } from "@/app/api/entries/route";
import { GET as getEntry, PATCH as patchEntry, DELETE as deleteEntry } from "@/app/api/entries/[id]/route";
import { GET as variant } from "@/app/api/photos/[id]/[variant]/route";
import { DELETE as deletePhoto } from "@/app/api/photos/[id]/route";
import { DELETE as unfriend } from "@/app/api/friends/[userId]/route";

const VARIANTS = ["thumb", "display", "original"] as const;

describe("access denied (SC-006)", () => {
  let store: MemoryPhotoStore;
  let an: TestUser; // owner
  let minh: TestUser; // friend, selected
  let lan: TestUser; // friend, not selected
  let khoa: TestUser; // not a friend
  let entryId: string;
  let photoId: string;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    store = new MemoryPhotoStore();
    setPhotoStoreForTests(store);
    an = await createUser("an_nguyen");
    minh = await createUser("minh_tran");
    lan = await createUser("lan_do");
    khoa = await createUser("khoa_pham");
    await makeFriends(an, minh);
    await makeFriends(an, lan);
    photoId = await uploadPhoto(store, an.cookie);
    const r = await call(createEntry, "POST", "/api/entries", {
      cookie: an.cookie,
      body: { title: "Sinh nhật mẹ", photoIds: [photoId], audience: { mode: "custom", userIds: [minh.id] } },
    });
    expect(r.status).toBe(201);
    entryId = r.body.entry.id;
  });
  afterAll(async () => {
    setPhotoStoreForTests(null);
    await closeTestDb();
  });

  const readEntry = (u?: TestUser) => call(getEntry, "GET", "/x", { cookie: u?.cookie, params: { id: entryId } });
  const readPhoto = (u: TestUser | undefined, v: (typeof VARIANTS)[number]) =>
    call(variant, "GET", "/x", { cookie: u?.cookie, params: { id: photoId, variant: v } });

  async function expectNoAccess(u: TestUser | undefined, status = 404) {
    expect((await readEntry(u)).status).toBe(status);
    for (const v of VARIANTS) expect((await readPhoto(u, v)).status).toBe(status);
  }

  async function expectAccess(u: TestUser) {
    expect((await readEntry(u)).status).toBe(200);
    for (const v of VARIANTS) expect((await readPhoto(u, v)).status).toBe(302);
  }

  it("the selected friend can view the entry and every photo variant", async () => {
    await expectAccess(minh);
  });

  it("a guest is refused (401) for the entry and every photo variant", async () => {
    await expectNoAccess(undefined, 401);
  });

  it("a non-friend gets 404", async () => {
    await expectNoAccess(khoa);
  });

  it("a friend who was not selected gets 404", async () => {
    await expectNoAccess(lan);
  });

  it("a viewer cannot edit, delete, remove photos or see the audience", async () => {
    const view = await readEntry(minh);
    expect(view.body.entry.isOwner).toBe(false);
    expect(view.body.entry.audience).toBeUndefined();
    const id = { id: entryId };
    expect((await call(patchEntry, "PATCH", "/x", { cookie: minh.cookie, params: id, body: { title: "x" } })).status).toBe(404);
    expect(
      (await call(patchEntry, "PATCH", "/x", { cookie: minh.cookie, params: id, body: { audience: { mode: "friends" } } })).status,
    ).toBe(404);
    expect((await call(patchEntry, "PATCH", "/x", { cookie: minh.cookie, params: id, body: { photoIds: [] } })).status).toBe(404);
    expect((await call(deleteEntry, "DELETE", "/x", { cookie: minh.cookie, params: id })).status).toBe(404);
    expect((await call(deletePhoto, "DELETE", "/x", { cookie: minh.cookie, params: { id: photoId } })).status).toBe(404);
    await expectAccess(an);
  });

  it("removing someone from the audience revokes access on their next request (FR-032)", async () => {
    await expectAccess(minh);
    const r = await call(patchEntry, "PATCH", "/x", {
      cookie: an.cookie,
      params: { id: entryId },
      body: { audience: { mode: "private" } },
    });
    expect(r.status).toBe(200);
    await expectNoAccess(minh);
  });

  it("unfriending revokes access in both directions (FR-032)", async () => {
    const minhPhoto = await uploadPhoto(store, minh.cookie);
    const minhEntry = await call(createEntry, "POST", "/api/entries", {
      cookie: minh.cookie,
      body: { title: "Của Minh", photoIds: [minhPhoto], audience: { mode: "friends" } },
    });
    const minhEntryId = minhEntry.body.entry.id;
    expect((await call(getEntry, "GET", "/x", { cookie: an.cookie, params: { id: minhEntryId } })).status).toBe(200);

    expect((await call(unfriend, "DELETE", "/x", { cookie: an.cookie, params: { userId: minh.id } })).status).toBe(204);

    await expectNoAccess(minh);
    expect((await call(getEntry, "GET", "/x", { cookie: an.cookie, params: { id: minhEntryId } })).status).toBe(404);
    expect(
      (await call(variant, "GET", "/x", { cookie: an.cookie, params: { id: minhPhoto, variant: "display" } })).status,
    ).toBe(404);
  });

  it("re-friending does not restore old access (FR-028)", async () => {
    await call(unfriend, "DELETE", "/x", { cookie: an.cookie, params: { userId: minh.id } });
    await makeFriends(an, minh);
    await expectNoAccess(minh);
  });

  it("a stale audience row without a friendship still grants nothing (double check)", async () => {
    const db = await setupTestDb();
    await db.insert(schema.entryAudience).values({ entryId, userId: khoa.id });
    await expectNoAccess(khoa);
  });

  it("sharing with someone who is not a friend is refused (422)", async () => {
    const r = await call(patchEntry, "PATCH", "/x", {
      cookie: an.cookie,
      params: { id: entryId },
      body: { audience: { mode: "custom", userIds: [khoa.id] } },
    });
    expect(r.status).toBe(422);
    await expectNoAccess(khoa);
  });
});
