import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call, sessionCookieFrom } from "../helpers/request";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/me/route";
import { schema } from "@/server/db/client";

describe("auth (contracts/api.md › Xác thực)", () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(resetTestDb);
  afterAll(closeTestDb);

  const signUp = (username = "an_nguyen", password = "matkhau123", displayName: string | undefined = "An") =>
    call(register, "POST", "/api/auth/register", { body: { username, password, displayName } });

  it("requires a display name (FR-001, rev 3.1)", async () => {
    const missing = await call(register, "POST", "/api/auth/register", {
      body: { username: "an_nguyen", password: "matkhau123" },
    });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields.displayName).toBeTruthy();
    for (const displayName of ["", "   "]) {
      const r = await signUp("an_nguyen", "matkhau123", displayName);
      expect(r.status).toBe(400);
      expect(r.body.error.fields.displayName).toBeTruthy();
    }
    expect((await signUp("an_nguyen", "matkhau123", "a".repeat(51))).status).toBe(400);
    expect((await signUp("an_nguyen", "matkhau123", "  An  ")).body.user.displayName).toBe("An");
  });

  it("registers, sets an HttpOnly session cookie and returns the user", async () => {
    const res = await signUp("An_Nguyen", "matkhau123", "An Nguyễn");
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ displayName: "An Nguyễn" });
    expect(res.body.user.handle).toMatch(/^an\.nguyen\.\d{4,6}$/);
    expect(res.body.user.username).toBeUndefined();
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/ms_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);

    const who = await call(me, "GET", "/api/me", { cookie: sessionCookieFrom(res.headers) });
    expect(who.status).toBe(200);
    expect(who.body.username).toBe("an_nguyen");
    expect(who.body.lastAudience).toEqual({ mode: "private", userIds: [] });
  });

  it("stores only a hash of the session token and an Argon2id password hash", async () => {
    const res = await signUp();
    const token = sessionCookieFrom(res.headers).split("=")[1];
    const db = await setupTestDb();
    const rows = await db.select().from(schema.sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(token);
    const [user] = await db.select().from(schema.users);
    expect(user.passwordHash?.startsWith("$argon2id$")).toBe(true);
  });

  it("rejects a taken username with 409", async () => {
    await signUp("minh_tran");
    const res = await signUp("MINH_TRAN");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects an invalid username or short password with 400 and field messages", async () => {
    const res = await signUp("a b", "123");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["username", "password"]));
  });

  it("returns the same 401 for unknown user and wrong password", async () => {
    await signUp();
    const wrongPass = await call(login, "POST", "/api/auth/login", { body: { username: "an_nguyen", password: "saimatkhau" } });
    const unknown = await call(login, "POST", "/api/auth/login", { body: { username: "khong_co", password: "saimatkhau" } });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body.error.message).toBe(unknown.body.error.message);
  });

  it("logs in with correct credentials (case-insensitive username)", async () => {
    await signUp();
    const res = await call(login, "POST", "/api/auth/login", { body: { username: "AN_NGUYEN", password: "matkhau123" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/ms_session=/);
  });

  it("blocks login after 5 failures in 15 minutes, even with the right password (FR-003)", async () => {
    await signUp();
    for (let i = 0; i < 5; i++) {
      const r = await call(login, "POST", "/api/auth/login", { body: { username: "an_nguyen", password: "sai" + i + "xxxxx" } });
      expect(r.status).toBe(401);
    }
    const blocked = await call(login, "POST", "/api/auth/login", { body: { username: "an_nguyen", password: "matkhau123" } });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
  });

  it("logout deletes the session", async () => {
    const res = await signUp();
    const cookie = sessionCookieFrom(res.headers);
    const out = await call(logout, "POST", "/api/auth/logout", { cookie });
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    const who = await call(me, "GET", "/api/me", { cookie });
    expect(who.status).toBe(401);
  });

  it("treats an expired session as unauthenticated", async () => {
    const res = await signUp();
    const cookie = sessionCookieFrom(res.headers);
    const db = await setupTestDb();
    await db.update(schema.sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    const who = await call(me, "GET", "/api/me", { cookie });
    expect(who.status).toBe(401);
  });

  it("rejects mutations without a matching Origin (CSRF)", async () => {
    const res = await call(register, "POST", "/api/auth/register", {
      body: { username: "an_nguyen", password: "matkhau123" },
      origin: "https://evil.example",
    });
    expect(res.status).toBe(403);
    const none = await call(register, "POST", "/api/auth/register", {
      body: { username: "an_nguyen", password: "matkhau123" },
      origin: null,
    });
    expect(none.status).toBe(403);
    const db = await setupTestDb();
    expect(await db.select().from(schema.users).where(eq(schema.users.username, "an_nguyen"))).toHaveLength(0);
  });

  // 002-google-login FR-G10, FR-G11
  it("never lets a Google-only account in through the password form; password accounts still work", async () => {
    const db = await setupTestDb();
    await db.insert(schema.users).values({
      googleSub: "google-sub-1",
      googleEmail: "an@gmail.com",
      displayName: "An Google",
      handle: "an.google.1234",
      inviteToken: "google-invite-token-000000",
    });
    for (const username of ["an.google.1234", "an@gmail.com", "google-sub-1", ""]) {
      const res = await call(login, "POST", "/api/auth/login", { body: { username: username || "x", password: "matkhau123" } });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    }
    expect((await signUp("minh_tran")).status).toBe(201);
    const ok = await call(login, "POST", "/api/auth/login", { body: { username: "minh_tran", password: "matkhau123" } });
    expect(ok.status).toBe(200);
  });
});
