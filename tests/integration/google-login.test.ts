// 002-google-login — contracts/api.md (start → callback → /login/google → complete), Google faked (research R8).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, makeFriends } from "../helpers/factories";
import {
  FakeGoogle,
  googleClaims,
  locationOf,
  setCookieLine,
  setCookieValue,
  TEST_GOOGLE_CLIENT_ID,
  TEST_GOOGLE_CLIENT_SECRET,
} from "../helpers/fake-google";
import { GET as start } from "@/app/api/auth/google/start/route";
import { GET as callback } from "@/app/api/auth/google/callback/route";
import { POST as complete } from "@/app/api/auth/google/complete/route";
import { GET as me } from "@/app/api/me/route";
import { GET as friends } from "@/app/api/friends/route";
import { POST as acceptInvite } from "@/app/api/invites/[token]/accept/route";
import { getDb, schema } from "@/server/db/client";
import { setGoogleClientForTests } from "@/server/services/google-oauth";

type Flow = { state: string; oauthCookie: string; location: string };

async function startFlow(next?: string): Promise<Flow> {
  const q = next === undefined ? "" : `?next=${encodeURIComponent(next)}`;
  const res = await call(start, "GET", `/api/auth/google/start${q}`, { origin: null });
  expect(res.status).toBe(302);
  const location = res.headers.get("location")!;
  const state = new URL(location).searchParams.get("state")!;
  return { state, oauthCookie: `ms_oauth=${setCookieValue(res.headers, "ms_oauth")}`, location };
}

async function finishCallback(flow: Flow, query?: string, cookie: string | undefined = flow.oauthCookie) {
  return call(callback, "GET", `/api/auth/google/callback?${query ?? `code=code-1&state=${flow.state}`}`, {
    origin: null,
    cookie,
  });
}

function signupCookie(headers: Headers): string {
  return `ms_gsignup=${setCookieValue(headers, "ms_gsignup")}`;
}

function sessionFrom(headers: Headers): string {
  const v = setCookieValue(headers, "ms_session");
  if (!v) throw new Error("no session cookie");
  return `ms_session=${v}`;
}

const submitName = (cookie: string | undefined, displayName: unknown, origin?: string | null) =>
  call(complete, "POST", "/api/auth/google/complete", { cookie, body: { displayName }, origin });

describe("Google login (002 US1)", () => {
  const google = new FakeGoogle();

  beforeAll(async () => {
    await setupTestDb();
    setGoogleClientForTests(google);
  });
  beforeEach(async () => {
    await resetTestDb();
    process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = TEST_GOOGLE_CLIENT_SECRET;
    google.claims = googleClaims();
    google.fail = null;
    google.calls = [];
  });
  afterAll(async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    setGoogleClientForTests(null);
    await closeTestDb();
  });

  const users = () => getDb().select().from(schema.users);
  const pending = () => getDb().select().from(schema.pendingGoogleSignups);

  describe("start", () => {
    it("goes back to /login when Google is not configured (FR-G01)", async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;
      const res = await call(start, "GET", "/api/auth/google/start", { origin: null });
      expect(res.status).toBe(302);
      expect(locationOf(res.headers)).toBe("/login");
      expect(setCookieValue(res.headers, "ms_oauth")).toBeUndefined();
    });

    it("redirects to Google with state + PKCE and sets a short-lived HttpOnly cookie", async () => {
      const res = await call(start, "GET", "/api/auth/google/start", { origin: null });
      expect(res.status).toBe(302);
      const url = new URL(res.headers.get("location")!);
      expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      const p = url.searchParams;
      expect(p.get("client_id")).toBe(TEST_GOOGLE_CLIENT_ID);
      expect(p.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
      expect(p.get("response_type")).toBe("code");
      expect(p.get("scope")).toBe("openid email profile");
      expect(p.get("code_challenge_method")).toBe("S256");
      expect(p.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(p.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const line = setCookieLine(res.headers, "ms_oauth")!;
      expect(line).toMatch(/HttpOnly/i);
      expect(line).toMatch(/SameSite=Lax/i);
      expect(line).toMatch(/Max-Age=600/);
      expect(line).toMatch(/Path=\/api\/auth\/google/);
      expect(res.headers.get("cache-control")).toBe("no-store");
      // Each start is a fresh login attempt
      const again = await call(start, "GET", "/api/auth/google/start", { origin: null });
      expect(new URL(again.headers.get("location")!).searchParams.get("state")).not.toBe(p.get("state"));
    });
  });

  describe("callback rejections (FR-G05, FR-G07, research R9)", () => {
    const expectNothingCreated = async (headers: Headers) => {
      expect(setCookieValue(headers, "ms_session")).toBeUndefined();
      expect(setCookieValue(headers, "ms_gsignup")).toBeUndefined();
      expect(setCookieLine(headers, "ms_oauth")).toMatch(/Max-Age=0/); // one-shot: always cleared
      expect(await users()).toHaveLength(0);
      expect(await pending()).toHaveLength(0);
    };

    it("user cancelled at Google → google_cancelled", async () => {
      const flow = await startFlow();
      const res = await finishCallback(flow, `error=access_denied&state=${flow.state}`);
      expect(res.status).toBe(302);
      expect(locationOf(res.headers)).toBe("/login?error=google_cancelled");
      await expectNothingCreated(res.headers);
      expect(google.calls).toHaveLength(0);
    });

    it("missing cookie (other browser) → google_failed", async () => {
      const flow = await startFlow();
      const res = await finishCallback(flow, undefined, "");
      expect(locationOf(res.headers)).toBe("/login?error=google_failed");
      await expectNothingCreated(res.headers);
      expect(google.calls).toHaveLength(0);
    });

    it("state mismatch → google_failed, code never exchanged", async () => {
      const flow = await startFlow();
      const res = await finishCallback(flow, "code=code-1&state=forged-state-value");
      expect(locationOf(res.headers)).toBe("/login?error=google_failed");
      await expectNothingCreated(res.headers);
      expect(google.calls).toHaveLength(0);
    });

    it("tampered cookie → google_failed", async () => {
      const flow = await startFlow();
      const res = await finishCallback(flow, undefined, "ms_oauth=not-base64-json");
      expect(locationOf(res.headers)).toBe("/login?error=google_failed");
      await expectNothingCreated(res.headers);
    });

    it("missing code → google_failed", async () => {
      const flow = await startFlow();
      const res = await finishCallback(flow, `state=${flow.state}`);
      expect(locationOf(res.headers)).toBe("/login?error=google_failed");
      await expectNothingCreated(res.headers);
    });

    it("Google token endpoint fails → google_failed", async () => {
      google.fail = new Error("invalid_grant");
      const flow = await startFlow();
      const res = await finishCallback(flow);
      expect(locationOf(res.headers)).toBe("/login?error=google_failed");
      await expectNothingCreated(res.headers);
    });

    it("token for another app → google_failed", async () => {
      google.claims = googleClaims({ aud: "another-app" });
      const flow = await startFlow();
      const res = await finishCallback(flow);
      expect(locationOf(res.headers)).toBe("/login?error=google_failed");
      await expectNothingCreated(res.headers);
    });

    it("unverified e-mail → google_unverified", async () => {
      google.claims = googleClaims({ email_verified: false });
      const flow = await startFlow();
      const res = await finishCallback(flow);
      expect(locationOf(res.headers)).toBe("/login?error=google_unverified");
      await expectNothingCreated(res.headers);
    });

    it("exchanges the code with the verifier and the same redirect URI", async () => {
      const flow = await startFlow();
      await finishCallback(flow);
      expect(google.calls).toHaveLength(1);
      expect(google.calls[0].code).toBe("code-1");
      expect(google.calls[0].redirectUri).toBe("http://localhost:3000/api/auth/google/callback");
      expect(google.calls[0].verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });
  });

  describe("new person: confirm display name (FR-G03, FR-G06)", () => {
    it("callback creates a pending sign-up, not an account", async () => {
      const flow = await startFlow();
      const res = await finishCallback(flow);
      expect(res.status).toBe(302);
      expect(locationOf(res.headers)).toBe("/login/google");
      expect(setCookieValue(res.headers, "ms_session")).toBeUndefined();
      const line = setCookieLine(res.headers, "ms_gsignup")!;
      expect(line).toMatch(/HttpOnly/i);
      expect(line).toMatch(/SameSite=Lax/i);
      expect(line).toMatch(/Max-Age=600/);
      expect(await users()).toHaveLength(0);
      const rows = await pending();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ googleSub: "google-sub-1", googleEmail: "an@gmail.com", suggestedName: "An Nguyễn" });
      expect(rows[0].tokenHash).not.toBe(setCookieValue(res.headers, "ms_gsignup")); // stored hashed
      expect(rows[0].expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(10 * 60_000);
    });

    it("rejects an empty or too long name and creates nothing", async () => {
      const cookie = signupCookie((await finishCallback(await startFlow())).headers);
      for (const name of ["", "   ", "a".repeat(51), undefined]) {
        const res = await submitName(cookie, name);
        expect(res.status).toBe(400);
        expect(res.body.error.fields.displayName).toBeTruthy();
      }
      expect(await users()).toHaveLength(0);
      expect(await pending()).toHaveLength(1); // still usable
    });

    it("creates the account with the confirmed name, signs in and consumes the pending row", async () => {
      const cookie = signupCookie((await finishCallback(await startFlow())).headers);
      const res = await submitName(cookie, "  Bé An  ");
      expect(res.status).toBe(201);
      expect(res.body.user.displayName).toBe("Bé An");
      expect(res.body.user.handle).toMatch(/^be\.an\.\d{4,6}$/);
      expect(res.body.next).toBeNull();
      expect(setCookieLine(res.headers, "ms_gsignup")).toMatch(/Max-Age=0/);

      const [u] = await users();
      expect(u).toMatchObject({ username: null, passwordHash: null, googleSub: "google-sub-1", googleEmail: "an@gmail.com" });
      expect(u.inviteToken.length).toBeGreaterThanOrEqual(24);
      expect(await pending()).toHaveLength(0);

      const who = await call(me, "GET", "/api/me", { cookie: sessionFrom(res.headers) });
      expect(who.status).toBe(200);
      expect(who.body).toMatchObject({ username: null, googleEmail: "an@gmail.com" });
      expect(who.body.user.displayName).toBe("Bé An");

      // The same cookie cannot be used twice
      expect((await submitName(cookie, "Bé An")).status).toBe(410);
      expect(await users()).toHaveLength(1);
    });

    it("410 GONE without a cookie, with an unknown cookie, or after expiry", async () => {
      expect((await submitName(undefined, "An")).status).toBe(410);
      expect((await submitName("ms_gsignup=unknown-token", "An")).body.error.code).toBe("GONE");
      const cookie = signupCookie((await finishCallback(await startFlow())).headers);
      await getDb().update(schema.pendingGoogleSignups).set({ expiresAt: new Date(Date.now() - 1000) });
      expect((await submitName(cookie, "An")).status).toBe(410);
      expect(await users()).toHaveLength(0);
    });

    it("rejects a cross-site submit (Origin check)", async () => {
      const cookie = signupCookie((await finishCallback(await startFlow())).headers);
      expect((await submitName(cookie, "An", "https://evil.example")).status).toBe(403);
      expect((await submitName(cookie, "An", null)).status).toBe(403);
      expect(await users()).toHaveLength(0);
    });

    it("two tabs finishing for the same Google account → one user (SC-003)", async () => {
      const c1 = signupCookie((await finishCallback(await startFlow())).headers);
      const c2 = signupCookie((await finishCallback(await startFlow())).headers);
      const r1 = await submitName(c1, "An");
      const r2 = await submitName(c2, "An khác");
      expect(r1.status).toBe(201);
      expect(r2.status).toBe(200);
      expect(r2.body.user.id).toBe(r1.body.user.id);
      expect(r2.body.user.displayName).toBe("An");
      expect(await users()).toHaveLength(1);
      expect(await pending()).toHaveLength(0);
      expect((await call(me, "GET", "/api/me", { cookie: sessionFrom(r2.headers) })).status).toBe(200);
    });
  });

  describe("returning person (FR-G02)", () => {
    it("signs straight in, no name step, no new account", async () => {
      const cookie = signupCookie((await finishCallback(await startFlow())).headers);
      const created = await submitName(cookie, "An");
      const res = await finishCallback(await startFlow());
      expect(res.status).toBe(302);
      expect(locationOf(res.headers)).toBe("/");
      expect(setCookieValue(res.headers, "ms_gsignup")).toBeUndefined();
      const who = await call(me, "GET", "/api/me", { cookie: sessionFrom(res.headers) });
      expect(who.body.user.id).toBe(created.body.user.id);
      expect(await users()).toHaveLength(1);
      expect(await pending()).toHaveLength(0);
    });

    it("keeps the stored Google e-mail up to date", async () => {
      await submitName(signupCookie((await finishCallback(await startFlow())).headers), "An");
      google.claims = googleClaims({ email: "an.moi@gmail.com" });
      await finishCallback(await startFlow());
      const [u] = await getDb().select().from(schema.users).where(eq(schema.users.googleSub, "google-sub-1"));
      expect(u.googleEmail).toBe("an.moi@gmail.com");
    });
  });

  it("never shows the Google e-mail to friends (FR-G09, SC-004)", async () => {
    const res = await submitName(signupCookie((await finishCallback(await startFlow())).headers), "An");
    const minh = await createUser("minh_tran", "Minh");
    await makeFriends(minh, res.body.user);
    const list = await call(friends, "GET", "/api/friends", { cookie: minh.cookie });
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).toContain(res.body.user.handle);
    expect(JSON.stringify(list.body)).not.toContain("an@gmail.com");
    expect(JSON.stringify(list.body)).not.toContain("google-sub-1");
    const own = await call(me, "GET", "/api/me", { cookie: minh.cookie });
    expect(JSON.stringify(own.body)).not.toContain("an@gmail.com");
  });

  describe("friend-invite link survives the Google flow (002 US2, FR-G08, SC-002)", () => {
    const inviteTokenOf = async (id: string) =>
      (await getDb().select({ t: schema.users.inviteToken }).from(schema.users).where(eq(schema.users.id, id)))[0].t;

    it("new person: next=/add/<token> is kept through the name step, then the invite works", async () => {
      const minh = await createUser("minh_tran", "Minh");
      const token = await inviteTokenOf(minh.id);
      const flow = await startFlow(`/add/${token}`);
      const cb = await finishCallback(flow);
      expect(locationOf(cb.headers)).toBe("/login/google");
      const res = await submitName(signupCookie(cb.headers), "An");
      expect(res.status).toBe(201);
      expect(res.body.next).toBe(`/add/${token}`);

      const accepted = await call(acceptInvite, "POST", `/api/invites/${token}/accept`, {
        cookie: sessionFrom(res.headers),
        params: { token },
      });
      expect(accepted.status).toBe(200);
      const list = await call(friends, "GET", "/api/friends", { cookie: minh.cookie });
      expect(JSON.stringify(list.body)).toContain(res.body.user.id);
    });

    it("returning person goes straight back to the invite link", async () => {
      await submitName(signupCookie((await finishCallback(await startFlow())).headers), "An");
      const res = await finishCallback(await startFlow("/add/abc123"));
      expect(locationOf(res.headers)).toBe("/add/abc123");
      expect(setCookieValue(res.headers, "ms_session")).toBeTruthy();
    });

    it.each(["//evil.com", "https://evil.com/x", "/\\evil.com", "javascript:alert(1)"])(
      "drops an unsafe next %j and lands on /",
      async (next) => {
        const flow = await startFlow(next);
        const created = await submitName(signupCookie((await finishCallback(flow)).headers), "An");
        expect(created.body.next).toBeNull();
        const again = await finishCallback(await startFlow(next));
        expect(locationOf(again.headers)).toBe("/");
      },
    );

    it("cancelling at Google keeps next so the invite is not lost", async () => {
      const flow = await startFlow("/add/abc123");
      const res = await finishCallback(flow, `error=access_denied&state=${flow.state}`);
      expect(locationOf(res.headers)).toBe("/login?error=google_cancelled&next=%2Fadd%2Fabc123");
    });
  });
});
