import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, type TestUser } from "../helpers/factories";
import { GET as overview } from "@/app/api/friends/route";
import { DELETE as unfriend } from "@/app/api/friends/[userId]/route";
import { POST as sendRequest } from "@/app/api/friends/requests/route";
import { DELETE as cancelRequest } from "@/app/api/friends/requests/[userId]/route";
import { POST as accept } from "@/app/api/friends/requests/[userId]/accept/route";
import { POST as decline } from "@/app/api/friends/requests/[userId]/decline/route";
import { schema } from "@/server/db/client";
import { msg } from "@/lib/messages";

describe("friends (contracts/api.md › Bạn bè; data-model.md state diagram)", () => {
  let an: TestUser;
  let minh: TestUser;
  let lan: TestUser;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    an = await createUser("an_nguyen", "An");
    minh = await createUser("minh_tran", "Minh");
    lan = await createUser("lan_do", "Lan");
  });
  afterAll(closeTestDb);

  const invite = (from: TestUser, handle: string) =>
    call(sendRequest, "POST", "/api/friends/requests", { cookie: from.cookie, body: { handle } });
  const view = async (u: TestUser) => (await call(overview, "GET", "/api/friends", { cookie: u.cookie })).body;
  const names = (list: { handle: string }[]) => list.map((x) => x.handle).sort();

  it("sends a request: pending for both sides", async () => {
    const r = await invite(an, "@" + minh.handle.toUpperCase());
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("pending");
    expect(names((await view(an)).outgoing)).toEqual([minh.handle]);
    const m = await view(minh);
    expect(names(m.incoming)).toEqual([an.handle]);
    expect(m.incoming[0].displayName).toBe("An");
  });

  it("rejects unknown usernames and yourself with 422", async () => {
    const unknown = await invite(an, "khong.ton.tai.0000");
    expect(unknown.status).toBe(422);
    expect(unknown.body.error.message).toBe(msg.userNotFound);
    const self = await invite(an, an.handle);
    expect(self.status).toBe(422);
    expect(self.body.error.message).toBe(msg.cannotFriendSelf);
  });

  it("does not duplicate a repeated request", async () => {
    await invite(an, minh.handle);
    const again = await invite(an, minh.handle);
    expect(again.status).toBe(200);
    expect(again.body.status).toBe("pending");
    const db = await setupTestDb();
    expect(await db.select().from(schema.friendRequests)).toHaveLength(1);
  });

  it("mutual requests become a friendship immediately and clear both requests (FR-023)", async () => {
    await invite(an, lan.handle);
    const back = await invite(lan, an.handle);
    expect(back.status).toBe(200);
    expect(back.body.status).toBe("friends");
    expect(names((await view(an)).friends)).toEqual([lan.handle]);
    expect(names((await view(lan)).friends)).toEqual([an.handle]);
    const db = await setupTestDb();
    expect(await db.select().from(schema.friendRequests)).toHaveLength(0);
  });

  it("accept makes both friends; accepting a missing request is 404", async () => {
    await invite(an, minh.handle);
    const ok = await call(accept, "POST", "/x", { cookie: minh.cookie, params: { userId: an.id } });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("friends");
    expect(names((await view(an)).friends)).toEqual([minh.handle]);
    expect((await view(minh)).incoming).toHaveLength(0);
    const again = await call(accept, "POST", "/x", { cookie: minh.cookie, params: { userId: an.id } });
    expect(again.status).toBe(404);
    // Inviting an existing friend reports the current state
    expect((await invite(an, minh.handle)).body.status).toBe("friends");
  });

  it("decline removes the request and the sender may invite again", async () => {
    await invite(an, minh.handle);
    expect((await call(decline, "POST", "/x", { cookie: minh.cookie, params: { userId: an.id } })).status).toBe(204);
    expect((await view(an)).outgoing).toHaveLength(0);
    expect((await view(minh)).friends).toHaveLength(0);
    expect((await invite(an, minh.handle)).status).toBe(201);
  });

  it("the sender can cancel a pending request", async () => {
    await invite(an, minh.handle);
    expect((await call(cancelRequest, "DELETE", "/x", { cookie: an.cookie, params: { userId: minh.id } })).status).toBe(204);
    expect((await view(minh)).incoming).toHaveLength(0);
  });

  it("unfriend removes the friendship for both sides", async () => {
    await invite(an, minh.handle);
    await call(accept, "POST", "/x", { cookie: minh.cookie, params: { userId: an.id } });
    expect((await call(unfriend, "DELETE", "/x", { cookie: minh.cookie, params: { userId: an.id } })).status).toBe(204);
    expect((await view(an)).friends).toHaveLength(0);
    expect((await view(minh)).friends).toHaveLength(0);
    expect((await call(unfriend, "DELETE", "/x", { cookie: minh.cookie, params: { userId: an.id } })).status).toBe(404);
  });

  it("requires a session", async () => {
    expect((await call(overview, "GET", "/api/friends")).status).toBe(401);
  });
});
