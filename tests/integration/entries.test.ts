import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { uploadPhoto } from "../helpers/photos";
import { setPhotoStoreForTests, photoKey } from "@/server/storage/photo-store";
import { POST as createEntry, GET as listEntries } from "@/app/api/entries/route";
import { GET as getEntry, PATCH as patchEntry, DELETE as deleteEntry } from "@/app/api/entries/[id]/route";
import { GET as variant } from "@/app/api/photos/[id]/[variant]/route";

describe("entries (contracts/api.md › Bài nhật ký)", () => {
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
    an = await createUser("an_nguyen", "An");
    minh = await createUser("minh_tran");
  });
  afterAll(async () => {
    setPhotoStoreForTests(null);
    await closeTestDb();
  });

  const create = (user: TestUser, body: Record<string, unknown>) =>
    call(createEntry, "POST", "/api/entries", { cookie: user.cookie, body: { kind: "journal", photoIds: [], ...body } });

  it("creates a text-only entry, private by default", async () => {
    const r = await create(an, { title: "Họp xong", body: "Nhẹ người", eventAt: "2026-11-20T12:10" });
    expect(r.status).toBe(201);
    expect(r.body.entry).toMatchObject({
      title: "Họp xong",
      body: "Nhẹ người",
      eventAt: "2026-11-20T12:10",
      kind: "journal",
      isOwner: true,
      author: { id: an.id, handle: an.handle, displayName: "An" },
      photos: [],
      audience: { mode: "private", users: [] },
    });
  });

  it("validates input: empty entry and future time are rejected", async () => {
    expect((await create(an, { title: " " })).status).toBe(400);
    const future = await create(an, { body: "x", eventAt: "2999-01-01T00:00" });
    expect(future.status).toBe(400);
    expect(future.body.error.fields.eventAt).toBeTruthy();
  });

  it("attaches the uploader's own pending photos in order", async () => {
    const p1 = await uploadPhoto(store, an.cookie);
    const p2 = await uploadPhoto(store, an.cookie);
    const r = await create(an, { title: "Sinh nhật mẹ", eventAt: "2026-11-24T21:10", photoIds: [p2, p1] });
    expect(r.status).toBe(201);
    expect(r.body.entry.photos.map((p: { id: string }) => p.id)).toEqual([p2, p1]);
    expect(r.body.entry.photos[0].thumbUrl).toBe(`/api/photos/${p2}/thumb`);
    // An attached photo cannot be attached again
    const again = await create(an, { title: "copy", photoIds: [p1] });
    expect(again.status).toBe(422);
  });

  it("refuses someone else's photo and more than 10 photos", async () => {
    const minhPhoto = await uploadPhoto(store, minh.cookie);
    expect((await create(an, { title: "x", photoIds: [minhPhoto] })).status).toBe(422);
    const ids = Array.from({ length: 11 }, () => crypto.randomUUID());
    expect((await create(an, { title: "x", photoIds: ids })).status).toBeGreaterThanOrEqual(400);
  });

  it("lists my timeline newest first with cursor pagination and date jump", async () => {
    const times = ["2026-11-10T09:00", "2026-11-16T21:10", "2026-11-17T12:10", "2026-11-17T20:30"];
    for (const t of times) await create(an, { title: t, eventAt: t });
    await create(minh, { title: "not mine", eventAt: "2026-11-17T23:00" });

    const all = await call(listEntries, "GET", "/api/entries?scope=mine", { cookie: an.cookie });
    expect(all.status).toBe(200);
    expect(all.body.items.map((x: { eventAt: string }) => x.eventAt)).toEqual([...times].reverse());
    expect(all.body.nextCursor).toBeNull();

    const jump = await call(listEntries, "GET", "/api/entries?scope=mine&date=2026-11-16", { cookie: an.cookie });
    expect(jump.body.items.map((x: { eventAt: string }) => x.eventAt)).toEqual(["2026-11-16T21:10", "2026-11-10T09:00"]);
  });

  it("paginates 20 per page without duplicates or gaps", async () => {
    for (let i = 0; i < 25; i++) await create(an, { title: `#${i}`, eventAt: "2026-11-20T10:00" });
    const first = await call(listEntries, "GET", "/api/entries?scope=mine", { cookie: an.cookie });
    expect(first.body.items).toHaveLength(20);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await call(listEntries, "GET", `/api/entries?scope=mine&cursor=${first.body.nextCursor}`, {
      cookie: an.cookie,
    });
    expect(second.body.items).toHaveLength(5);
    const ids = new Set([...first.body.items, ...second.body.items].map((x: { id: string }) => x.id));
    expect(ids.size).toBe(25);
  });

  it("owner can edit time and remove a photo (its files are deleted)", async () => {
    const p1 = await uploadPhoto(store, an.cookie);
    const p2 = await uploadPhoto(store, an.cookie);
    const { body } = await create(an, { title: "a", eventAt: "2026-11-24T21:10", photoIds: [p1, p2] });
    const id = body.entry.id;
    const r = await call(patchEntry, "PATCH", "/x", {
      cookie: an.cookie,
      params: { id },
      body: { eventAt: "2026-11-23T08:00", photoIds: [p2] },
    });
    expect(r.status).toBe(200);
    expect(r.body.entry.eventAt).toBe("2026-11-23T08:00");
    expect(r.body.entry.photos.map((p: { id: string }) => p.id)).toEqual([p2]);
    expect(store.objects.has(photoKey(p1, "original"))).toBe(false);
    const gone = await call(variant, "GET", "/x", { cookie: an.cookie, params: { id: p1, variant: "thumb" } });
    expect(gone.status).toBe(404);
  });

  it("hides entries from non-owners: GET/PATCH/DELETE return 404 (FR-031)", async () => {
    const { body } = await create(an, { title: "riêng tư" });
    const id = body.entry.id;
    expect((await call(getEntry, "GET", "/x", { cookie: minh.cookie, params: { id } })).status).toBe(404);
    expect((await call(patchEntry, "PATCH", "/x", { cookie: minh.cookie, params: { id }, body: { title: "hack" } })).status).toBe(404);
    expect((await call(deleteEntry, "DELETE", "/x", { cookie: minh.cookie, params: { id } })).status).toBe(404);
    expect((await call(getEntry, "GET", "/x", { params: { id } })).status).toBe(401);
    expect((await call(getEntry, "GET", "/x", { cookie: an.cookie, params: { id: "not-a-uuid" } })).status).toBe(404);
  });

  it("delete removes the entry and its photos", async () => {
    const p1 = await uploadPhoto(store, an.cookie);
    const { body } = await create(an, { title: "x", photoIds: [p1] });
    const id = body.entry.id;
    expect((await call(deleteEntry, "DELETE", "/x", { cookie: an.cookie, params: { id } })).status).toBe(204);
    expect((await call(getEntry, "GET", "/x", { cookie: an.cookie, params: { id } })).status).toBe(404);
    expect(store.objects.size).toBe(0);
  });
});
