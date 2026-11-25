import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, makeFriends, type TestUser } from "../helpers/factories";
import { GET as getLink, POST as rotateLink } from "@/app/api/friends/invite-link/route";
import { GET as viewInvite } from "@/app/api/invites/[token]/route";
import { POST as acceptInvite } from "@/app/api/invites/[token]/accept/route";
import { POST as sendRequest } from "@/app/api/friends/requests/route";
import { GET as overview } from "@/app/api/friends/route";
import { schema } from "@/server/db/client";

describe("invite links (US5, FR-039..FR-041)", () => {
  let an: TestUser;
  let minh: TestUser;

  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    an = await createUser("an_nguyen", "An Nguyễn");
    minh = await createUser("minh_tran", "Minh Trần");
  });
  afterAll(closeTestDb);

  const tokenOf = async (u: TestUser) => {
    const r = await call(getLink, "GET", "/api/friends/invite-link", { cookie: u.cookie });
    expect(r.status).toBe(200);
    expect(r.body.url).toMatch(/^http:\/\/localhost:3000\/add\/[A-Za-z0-9_-]{20,}$/);
    return r.body.url.split("/add/")[1] as string;
  };
  const friendsOf = async (u: TestUser) =>
    (await call(overview, "GET", "/api/friends", { cookie: u.cookie })).body as {
      friends: { id: string }[];
      incoming: unknown[];
      outgoing: unknown[];
    };

  it("registration assigns a handle derived from the display name", () => {
    expect(an.handle).toMatch(/^an\.nguyen\.\d{4,6}$/);
    expect(minh.handle).toMatch(/^minh\.tran\.\d{4,6}$/);
  });

  it("anyone with the link can see who invited them (no login needed), without the username", async () => {
    const token = await tokenOf(an);
    const r = await call(viewInvite, "GET", "/x", { params: { token } });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      inviter: { id: an.id, handle: an.handle, displayName: "An Nguyễn" },
      status: "login_required",
    });
    expect(JSON.stringify(r.body)).not.toContain("an_nguyen");
  });

  it("opening the link while signed in makes both friends at once and clears pending requests", async () => {
    await call(sendRequest, "POST", "/api/friends/requests", { cookie: an.cookie, body: { handle: minh.handle } });
    const token = await tokenOf(an);
    expect((await call(viewInvite, "GET", "/x", { cookie: minh.cookie, params: { token } })).body.status).toBe("available");
    const r = await call(acceptInvite, "POST", "/x", { cookie: minh.cookie, params: { token } });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("friends");
    expect((await friendsOf(an)).friends.map((f) => f.id)).toEqual([minh.id]);
    expect((await friendsOf(minh)).incoming).toHaveLength(0);
    const db = await setupTestDb();
    expect(await db.select().from(schema.friendRequests)).toHaveLength(0);
  });

  it("is idempotent when already friends", async () => {
    await makeFriends(an, minh);
    const token = await tokenOf(an);
    expect((await call(viewInvite, "GET", "/x", { cookie: minh.cookie, params: { token } })).body.status).toBe("friends");
    expect((await call(acceptInvite, "POST", "/x", { cookie: minh.cookie, params: { token } })).status).toBe(200);
  });

  it("opening your own link is refused", async () => {
    const token = await tokenOf(an);
    expect((await call(viewInvite, "GET", "/x", { cookie: an.cookie, params: { token } })).body.status).toBe("self");
    expect((await call(acceptInvite, "POST", "/x", { cookie: an.cookie, params: { token } })).status).toBe(422);
  });

  it("accepting requires a session", async () => {
    const token = await tokenOf(an);
    expect((await call(acceptInvite, "POST", "/x", { params: { token } })).status).toBe(401);
  });

  it("creating a new link invalidates the old one immediately", async () => {
    const old = await tokenOf(an);
    const r = await call(rotateLink, "POST", "/api/friends/invite-link", { cookie: an.cookie });
    expect(r.status).toBe(200);
    const fresh = r.body.url.split("/add/")[1];
    expect(fresh).not.toBe(old);
    expect((await call(viewInvite, "GET", "/x", { params: { token: old } })).status).toBe(404);
    expect((await call(acceptInvite, "POST", "/x", { cookie: minh.cookie, params: { token: old } })).status).toBe(404);
    expect((await call(acceptInvite, "POST", "/x", { cookie: minh.cookie, params: { token: fresh } })).status).toBe(200);
  });

  it("unknown or malformed tokens are 404", async () => {
    expect((await call(viewInvite, "GET", "/x", { params: { token: "nope" } })).status).toBe(404);
    expect((await call(viewInvite, "GET", "/x", { params: { token: "A".repeat(24) } })).status).toBe(404);
  });
});
