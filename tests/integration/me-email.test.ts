// 005 US4 — add / change my e-mail on /me. spec FR-E01, FR-E05, FR-E13–FR-E15; research R7; contracts/api.md › Email của tôi
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call } from "../helpers/request";
import { createUser, makeFriends } from "../helpers/factories";
import { installMemoryMailer, type MemoryMailer } from "../helpers/memory-mailer";
import { POST as emailStart } from "@/app/api/me/email/start/route";
import { POST as emailVerify } from "@/app/api/me/email/verify/route";
import { POST as resend } from "@/app/api/auth/codes/resend/route";
import { GET as me } from "@/app/api/me/route";
import { GET as friends } from "@/app/api/friends/route";
import { GET as invite } from "@/app/api/invites/[token]/route";
import { getDb, schema } from "@/server/db/client";
import { setMailerForTests } from "@/server/mail/mailer";
import { eq, sql } from "drizzle-orm";
import { generateMetadata } from "@/app/add/[token]/page";

const start = (cookie: string | undefined, email: string) =>
  call(emailStart, "POST", "/api/me/email/start", { cookie, body: { email } });
const verify = (cookie: string | undefined, ticket: string, code: string) =>
  call(emailVerify, "POST", "/api/me/email/verify", { cookie, body: { ticket, code } });

describe("my e-mail on /me (005 US4)", () => {
  let mailer: MemoryMailer;
  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    mailer = installMemoryMailer();
  });
  afterAll(async () => {
    setMailerForTests(undefined);
    await closeTestDb();
  });

  it("requires a session", async () => {
    expect((await start(undefined, "an@gmail.com")).status).toBe(401);
    expect((await verify(undefined, "t", "123456")).status).toBe(401);
  });

  it("an old account adds an e-mail with a code; /api/me then shows it", async () => {
    const an = await createUser("an_nguyen", "An");
    expect((await call(me, "GET", "/api/me", { cookie: an.cookie })).body.email).toBeNull();
    const res = await start(an.cookie, " An@Gmail.com ");
    expect(res.status).toBe(202);
    const done = await verify(an.cookie, res.body.ticket, mailer.lastCodeFor("an@gmail.com")!);
    expect(done.status).toBe(200);
    expect(done.body).toEqual({ email: "an@gmail.com" });
    expect((await call(me, "GET", "/api/me", { cookie: an.cookie })).body.email).toBe("an@gmail.com");
  });

  it("changing keeps the old e-mail until the new one is verified", async () => {
    const an = await createUser("an_nguyen", "An", "cu@gmail.com");
    const res = await start(an.cookie, "moi@gmail.com");
    expect((await call(me, "GET", "/api/me", { cookie: an.cookie })).body.email).toBe("cu@gmail.com");
    await verify(an.cookie, res.body.ticket, mailer.lastCodeFor("moi@gmail.com")!);
    expect((await call(me, "GET", "/api/me", { cookie: an.cookie })).body.email).toBe("moi@gmail.com");
  });

  it("rejects my current e-mail and a malformed one", async () => {
    const an = await createUser("an_nguyen", "An", "an@gmail.com");
    const same = await start(an.cookie, "AN@gmail.com");
    expect(same.status).toBe(400);
    expect(same.body.error.fields.email).toBeTruthy();
    expect((await start(an.cookie, "khong-hop-le")).status).toBe(400);
    expect(mailer.sent).toHaveLength(0);
  });

  it("does not reveal that another account uses the e-mail; it can never be verified (FR-E05)", async () => {
    await createUser("minh_tran", "Minh", "minh@gmail.com");
    const an = await createUser("an_nguyen", "An");
    const res = await start(an.cookie, "minh@gmail.com");
    expect(res.status).toBe(202);
    expect(mailer.to("minh@gmail.com").at(-1)!.subject).toMatch(/đã có tài khoản/);
    expect(mailer.lastCodeFor("minh@gmail.com")).toBeNull();
    expect((await verify(an.cookie, res.body.ticket, "123456")).body.error.code).toBe("CODE_INVALID");
  });

  it("someone else's ticket is useless — to verify and to resend", async () => {
    const an = await createUser("an_nguyen", "An");
    const binh = await createUser("binh_le", "Bình");
    const res = await start(an.cookie, "an@gmail.com");
    const code = mailer.lastCodeFor("an@gmail.com")!;
    expect((await verify(binh.cookie, res.body.ticket, code)).status).toBe(410);
    await getDb()
      .update(schema.emailCodes)
      .set({ sentAt: sql`sent_at - interval '2 minutes'` });
    expect((await call(resend, "POST", "/api/auth/codes/resend", { cookie: binh.cookie, body: { ticket: res.body.ticket } })).status).toBe(410);
    // An's own code still works afterwards
    expect((await verify(an.cookie, res.body.ticket, code)).status).toBe(200);
  });

  it("409 when another account verified the same e-mail meanwhile", async () => {
    const an = await createUser("an_nguyen", "An");
    const res = await start(an.cookie, "chung@gmail.com");
    const code = mailer.lastCodeFor("chung@gmail.com")!;
    await createUser("binh_le", "Bình", "chung@gmail.com");
    const lost = await verify(an.cookie, res.body.ticket, code);
    expect(lost.status).toBe(409);
    const [u] = await getDb().select().from(schema.users).where(eq(schema.users.username, "an_nguyen"));
    expect(u.email).toBeNull();
  });

  it("friends never see the e-mail anywhere (FR-E15)", async () => {
    const an = await createUser("an_nguyen", "An", "an.bimat@gmail.com");
    const minh = await createUser("minh_tran", "Minh");
    await makeFriends(an, minh);
    const list = await call(friends, "GET", "/api/friends", { cookie: minh.cookie });
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain("an.bimat");
    const own = await call(me, "GET", "/api/me", { cookie: minh.cookie });
    expect(JSON.stringify(own.body)).not.toContain("an.bimat");

    const [{ token }] = await getDb()
      .select({ token: schema.users.inviteToken })
      .from(schema.users)
      .where(eq(schema.users.id, an.id));
    const page = await call(invite, "GET", `/api/invites/${token}`, { cookie: minh.cookie, params: { token } });
    expect(JSON.stringify(page.body)).not.toContain("an.bimat");
    const meta = await generateMetadata({ params: Promise.resolve({ token }) });
    expect(JSON.stringify(meta)).not.toContain("an.bimat");
  });
});
