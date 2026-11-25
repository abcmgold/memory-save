// SC-009 / FR-038: a username is a login secret — it is never sent to anyone but its owner.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, makeFriends, type TestUser } from "../helpers/factories";
import { MemoryPhotoStore } from "../helpers/memory-photo-store";
import { setPhotoStoreForTests } from "@/server/storage/photo-store";
import { POST as createEntry, GET as listEntries } from "@/app/api/entries/route";
import { GET as getEntry } from "@/app/api/entries/[id]/route";
import { GET as overview } from "@/app/api/friends/route";
import { POST as sendRequest } from "@/app/api/friends/requests/route";
import { GET as me } from "@/app/api/me/route";
import { msg } from "@/lib/messages";

describe("username privacy (FR-038, SC-009)", () => {
  let an: TestUser;
  let minh: TestUser;
  let khoa: TestUser;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    setPhotoStoreForTests(new MemoryPhotoStore());
    an = await createUser("an_secret_login", "An Nguyễn");
    minh = await createUser("minh_secret_login", "Minh");
    khoa = await createUser("khoa_secret_login", "Khoa");
    await makeFriends(an, minh);
  });
  afterAll(async () => {
    setPhotoStoreForTests(null);
    await closeTestDb();
  });

  it("other people never receive a username in any response", async () => {
    const e = await call(createEntry, "POST", "/api/entries", {
      cookie: an.cookie,
      body: { title: "x", eventAt: "2026-11-20T08:00", audience: { mode: "friends" } },
    });
    await call(sendRequest, "POST", "/api/friends/requests", { cookie: khoa.cookie, body: { handle: an.handle } });

    const seenByOthers = [
      await call(overview, "GET", "/api/friends", { cookie: minh.cookie }),
      await call(overview, "GET", "/api/friends", { cookie: an.cookie }), // shows minh + khoa
      await call(listEntries, "GET", "/api/entries?scope=friends", { cookie: minh.cookie }),
      await call(getEntry, "GET", "/x", { cookie: minh.cookie, params: { id: e.body.entry.id } }),
      await call(overview, "GET", "/api/friends", { cookie: khoa.cookie }),
    ];
    for (const r of seenByOthers) {
      expect(r.status).toBe(200);
      const text = JSON.stringify(r.body);
      for (const login of ["an_secret_login", "minh_secret_login", "khoa_secret_login"]) {
        // each response may only contain the caller's own login — and these endpoints don't even do that
        expect(text).not.toContain(login);
      }
    }
  });

  it("/api/me returns the username to its owner only", async () => {
    const r = await call(me, "GET", "/api/me", { cookie: an.cookie });
    expect(r.body.username).toBe("an_secret_login");
    expect(r.body.user.handle).toBe(an.handle);
  });

  it("friend requests use the public handle; a username does not work", async () => {
    const byLogin = await call(sendRequest, "POST", "/api/friends/requests", {
      cookie: khoa.cookie,
      body: { handle: "an_secret_login" },
    });
    expect(byLogin.status).toBe(422);
    expect(byLogin.body.error.message).toBe(msg.userNotFound);
    const byHandle = await call(sendRequest, "POST", "/api/friends/requests", {
      cookie: khoa.cookie,
      body: { handle: "@" + an.handle.toUpperCase() },
    });
    expect(byHandle.status).toBe(201);
  });
});
