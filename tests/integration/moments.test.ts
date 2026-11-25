import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, makeFriends, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { setPhotoStoreForTests } from "@/server/storage/photo-store";
import { POST as createEntry, GET as listEntries } from "@/app/api/entries/route";
import { PATCH as patchEntry, DELETE as deleteEntry } from "@/app/api/entries/[id]/route";
import { GET as me } from "@/app/api/me/route";
import { DELETE as unfriend } from "@/app/api/friends/[userId]/route";

describe("moments feed — entries shared with me (US4)", () => {
  let an: TestUser;
  let minh: TestUser;
  let lan: TestUser;
  let dung: TestUser;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    setPhotoStoreForTests(new MemoryPhotoStore());
    an = await createUser("an_nguyen", "An");
    minh = await createUser("minh_tran", "Minh");
    lan = await createUser("lan_do", "Lan");
    dung = await createUser("dung_le", "Dũng");
    await makeFriends(an, minh);
    await makeFriends(an, lan);
  });
  afterAll(async () => {
    setPhotoStoreForTests(null);
    await closeTestDb();
  });

  const post = (u: TestUser, title: string, eventAt: string, audience: Record<string, unknown>) =>
    call(createEntry, "POST", "/api/entries", { cookie: u.cookie, body: { title, eventAt, audience } });
  const feed = async (u: TestUser) =>
    (await call(listEntries, "GET", "/api/entries?scope=friends", { cookie: u.cookie })).body.items as {
      id: string;
      title: string;
      author: { id: string };
    }[];

  it("shows only entries shared with me, newest first, with the author", async () => {
    await post(an, "riêng", "2026-11-20T08:00", { mode: "private" });
    await post(an, "cho Minh", "2026-11-21T08:00", { mode: "custom", userIds: [minh.id] });
    await post(an, "tất cả", "2026-11-22T08:00", { mode: "friends" });
    await post(lan, "của Lan", "2026-11-19T08:00", { mode: "private" });

    const m = await feed(minh);
    expect(m.map((e) => e.title)).toEqual(["tất cả", "cho Minh"]);
    expect(m[0].author.id).toBe(an.id);
    expect((await feed(lan)).map((e) => e.title)).toEqual(["tất cả"]);
    expect(await feed(an)).toEqual([]);
  });

  it("'all friends' is a snapshot: a later friend does not see older posts (FR-028)", async () => {
    await post(an, "cũ", "2026-11-20T08:00", { mode: "friends" });
    await makeFriends(an, dung);
    expect(await feed(dung)).toEqual([]);
    await post(an, "mới", "2026-11-21T08:00", { mode: "friends" });
    expect((await feed(dung)).map((e) => e.title)).toEqual(["mới"]);
  });

  it("remembers the last audience choice as the next default (FR-027)", async () => {
    const first = await call(me, "GET", "/api/me", { cookie: an.cookie });
    expect(first.body.lastAudience).toEqual({ mode: "private", userIds: [] });
    await post(an, "x", "2026-11-20T08:00", { mode: "custom", userIds: [lan.id] });
    const after = await call(me, "GET", "/api/me", { cookie: an.cookie });
    expect(after.body.lastAudience).toEqual({ mode: "custom", userIds: [lan.id] });
  });

  it("the owner sees who an entry is shared with", async () => {
    const r = await post(an, "x", "2026-11-20T08:00", { mode: "custom", userIds: [minh.id, lan.id] });
    expect(r.body.entry.audience.mode).toBe("custom");
    expect(r.body.entry.audience.users.map((u: { id: string }) => u.id).sort()).toEqual([lan.id, minh.id].sort());
  });

  it("viewers see edits; deleted entries disappear", async () => {
    const r = await post(an, "trước", "2026-11-20T08:00", { mode: "friends" });
    const id = r.body.entry.id;
    await call(patchEntry, "PATCH", "/x", { cookie: an.cookie, params: { id }, body: { title: "sau" } });
    expect((await feed(minh)).map((e) => e.title)).toEqual(["sau"]);
    await call(deleteEntry, "DELETE", "/x", { cookie: an.cookie, params: { id } });
    expect(await feed(minh)).toEqual([]);
  });

  it("unfriending removes the other person's posts from my feed", async () => {
    await post(an, "x", "2026-11-20T08:00", { mode: "friends" });
    await call(unfriend, "DELETE", "/x", { cookie: minh.cookie, params: { userId: an.id } });
    expect(await feed(minh)).toEqual([]);
    expect((await feed(lan)).map((e) => e.title)).toEqual(["x"]);
  });
});
