// 005 US3 — forgot password. spec FR-E05, FR-E11, FR-E12; research R4, R6; contracts/api.md › Quên mật khẩu
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call, sessionCookieFrom } from "../helpers/request";
import { createUser } from "../helpers/factories";
import { installMemoryMailer, type MemoryMailer } from "../helpers/memory-mailer";
import { signUpStart } from "../helpers/signup";
import { POST as resetStart } from "@/app/api/auth/password-reset/start/route";
import { POST as resetVerify } from "@/app/api/auth/password-reset/verify/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/me/route";
import { getDb, schema } from "@/server/db/client";
import { setMailerForTests } from "@/server/mail/mailer";

const start = (email: string) => call(resetStart, "POST", "/api/auth/password-reset/start", { body: { email } });
const verify = (ticket: string, code: string, password = "matkhaumoi456") =>
  call(resetVerify, "POST", "/api/auth/password-reset/verify", { body: { ticket, code, password } });
const loginAs = (username: string, password: string) =>
  call(login, "POST", "/api/auth/login", { body: { username, password } });

describe("forgot password (005 US3)", () => {
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

  it("mails a code; the new password works, the old one and every old session do not", async () => {
    const an = await createUser("an_nguyen", "An", "an@gmail.com");
    const res = await start(" AN@gmail.com ");
    expect(res.status).toBe(202);
    expect(Object.keys(res.body).sort()).toEqual(["expiresIn", "resendIn", "ticket"]);
    const code = mailer.lastCodeFor("an@gmail.com")!;
    expect(mailer.to("an@gmail.com").at(-1)!.text).toMatch(/mật khẩu/);

    await getDb().insert(schema.loginAttempts).values({ username: "an_nguyen" });
    const done = await verify(res.body.ticket, code);
    expect(done.status).toBe(200);
    expect(done.body.user.id).toBe(an.id);

    expect((await call(me, "GET", "/api/me", { cookie: an.cookie })).status).toBe(401); // old session gone
    expect((await call(me, "GET", "/api/me", { cookie: sessionCookieFrom(done.headers) })).status).toBe(200);
    expect((await loginAs("an_nguyen", "matkhau123")).status).toBe(401);
    expect((await loginAs("an_nguyen", "matkhaumoi456")).status).toBe(200);
    expect((await verify(res.body.ticket, code)).status).toBe(410); // single use
  });

  it("clears failed-login lockouts after a reset", async () => {
    await createUser("an_nguyen", "An", "an@gmail.com");
    for (let i = 0; i < 5; i++) await loginAs("an_nguyen", `sai${i}xxxxx`);
    expect((await loginAs("an_nguyen", "matkhau123")).status).toBe(429);
    const res = await start("an@gmail.com");
    await verify(res.body.ticket, mailer.lastCodeFor("an@gmail.com")!);
    expect((await loginAs("an_nguyen", "matkhaumoi456")).status).toBe(200);
  });

  it("answers the same for an unknown e-mail and sends nothing", async () => {
    await createUser("an_nguyen", "An", "an@gmail.com");
    const known = await start("an@gmail.com");
    const unknown = await start("khong.co@gmail.com");
    expect(unknown.status).toBe(known.status);
    expect(Object.keys(unknown.body).sort()).toEqual(Object.keys(known.body).sort());
    expect(mailer.to("khong.co@gmail.com")).toHaveLength(0);
    expect((await verify(unknown.body.ticket, "123456")).body.error.code).toBe("CODE_INVALID");
  });

  it("tells a Google-only account to use Google; no code works", async () => {
    await getDb().insert(schema.users).values({
      googleSub: "sub-1",
      email: "gg@gmail.com",
      emailVerifiedAt: new Date(),
      displayName: "GG",
      handle: "gg.1234",
      inviteToken: "token-gg-000000000000000",
    });
    const res = await start("gg@gmail.com");
    expect(res.status).toBe(202);
    const mail = mailer.to("gg@gmail.com").at(-1)!;
    expect(mail.subject).toMatch(/Google/);
    expect(mailer.lastCodeFor("gg@gmail.com")).toBeNull();
    expect((await verify(res.body.ticket, "000000")).body.error.code).toBe("CODE_INVALID");
  });

  it("an invalid new password is a 400 that does not spend a try; the password stays", async () => {
    await createUser("an_nguyen", "An", "an@gmail.com");
    const res = await start("an@gmail.com");
    const code = mailer.lastCodeFor("an@gmail.com")!;
    const short = await verify(res.body.ticket, code, "123");
    expect(short.status).toBe(400);
    expect(short.body.error.fields.password).toBeTruthy();
    const wrong = code === "000000" ? "111111" : "000000";
    const miss = await verify(res.body.ticket, wrong);
    expect(miss.body.error).toMatchObject({ code: "CODE_INVALID", attemptsLeft: 4 }); // 400 above did not count
    expect((await loginAs("an_nguyen", "matkhau123")).status).toBe(200);
  });

  it("wrong, expired or wrong-purpose codes leave the password unchanged", async () => {
    await createUser("an_nguyen", "An", "an@gmail.com");
    const res = await start("an@gmail.com");
    await getDb()
      .update(schema.emailCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.emailCodes.purpose, "reset_password"));
    expect((await verify(res.body.ticket, mailer.lastCodeFor("an@gmail.com")!)).status).toBe(410);

    // a sign-up code for the same address cannot reset the password
    const signup = await signUpStart({ username: "nguoi_moi", password: "matkhau123", displayName: "Mới", email: "moi@gmail.com" });
    expect((await verify(signup.body.ticket, mailer.lastCodeFor("moi@gmail.com")!)).status).toBe(410);
    expect((await loginAs("an_nguyen", "matkhau123")).status).toBe(200);
  });

  it("validates the e-mail and reports a missing mail setup", async () => {
    expect((await start("khong-hop-le")).status).toBe(400);
    setMailerForTests(null);
    expect((await start("an@gmail.com")).status).toBe(503);
  });
});
