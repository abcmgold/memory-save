// 005 US1 — sign-up with a verified e-mail. spec FR-E01, FR-E05, FR-E07, FR-E08; research R4, R5; contracts/api.md › Đăng ký
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { call, sessionCookieFrom } from "../helpers/request";
import { installMemoryMailer, type MemoryMailer } from "../helpers/memory-mailer";
import { signUp, signUpStart, signUpVerify } from "../helpers/signup";
import { POST as resend } from "@/app/api/auth/codes/resend/route";
import { GET as me } from "@/app/api/me/route";
import { getDb, schema } from "@/server/db/client";
import { setMailerForTests } from "@/server/mail/mailer";

const FORM = { username: "an_nguyen", password: "matkhau123", displayName: "An Nguyễn", email: " An@Gmail.com " };

describe("sign-up with e-mail code (005 US1)", () => {
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

  const users = () => getDb().select().from(schema.users);

  it("start sends a code and creates nothing; verify creates the account with a verified e-mail and signs in", async () => {
    const started = await signUpStart(FORM);
    expect(started.status).toBe(202);
    expect(started.body).toEqual({ ticket: expect.any(String), resendIn: 60, expiresIn: 600 });
    expect(await users()).toHaveLength(0);
    const code = mailer.lastCodeFor("an@gmail.com")!;
    expect(code).toMatch(/^[0-9]{6}$/);

    const done = await signUpVerify(started.body.ticket, code);
    expect(done.status).toBe(201);
    expect(done.body.user).toMatchObject({ displayName: "An Nguyễn" });
    expect(done.body.next).toBeNull();
    const [u] = await users();
    expect(u).toMatchObject({ username: "an_nguyen", email: "an@gmail.com" });
    expect(u.emailVerifiedAt).toBeInstanceOf(Date);
    expect(u.passwordHash?.startsWith("$argon2id$")).toBe(true);

    const who = await call(me, "GET", "/api/me", { cookie: sessionCookieFrom(done.headers) });
    expect(who.body).toMatchObject({ username: "an_nguyen", email: "an@gmail.com" });
    // the code is single-use
    expect((await signUpVerify(started.body.ticket, code)).status).toBe(410);
  });

  it("keeps a safe `next` and drops an outside one", async () => {
    const ok = await signUp(mailer, { ...FORM, next: "/add/abc123" });
    expect(ok.body.next).toBe("/add/abc123");
    await resetTestDb();
    const evil = await signUp(mailer, { ...FORM, next: "https://evil.example/x" });
    expect(evil.status).toBe(201);
    expect(evil.body.next).toBeNull();
  });

  it("never stores the plain password in the pending code", async () => {
    await signUpStart(FORM);
    const [row] = await getDb().select().from(schema.emailCodes);
    expect(JSON.stringify(row)).not.toContain("matkhau123");
    expect(row.payload?.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("validates every field before sending anything", async () => {
    const bad = await signUpStart({ username: "a b", password: "123", displayName: " ", email: "khong-phai-email" });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.fields)).toEqual(
      expect.arrayContaining(["username", "password", "displayName", "email"]),
    );
    const missingEmail = await signUpStart({ username: "an_nguyen", password: "matkhau123", displayName: "An" });
    expect(missingEmail.status).toBe(400);
    expect(missingEmail.body.error.fields.email).toBeTruthy();
    expect(mailer.sent).toHaveLength(0);
  });

  it("rejects a taken username right away without mailing", async () => {
    await signUp(mailer, { ...FORM });
    const before = mailer.sent.length;
    const res = await signUpStart({ ...FORM, username: "AN_NGUYEN", email: "khac@gmail.com" });
    expect(res.status).toBe(409);
    expect(res.body.error.fields.username).toBeTruthy();
    expect(mailer.sent.length).toBe(before);
  });

  it("does not reveal that an e-mail has an account (FR-E05)", async () => {
    await signUp(mailer, { ...FORM });
    const res = await signUpStart({ ...FORM, username: "nguoi_khac" });
    expect(res.status).toBe(202);
    expect(Object.keys(res.body).sort()).toEqual(["expiresIn", "resendIn", "ticket"]);
    const mail = mailer.to("an@gmail.com").at(-1)!;
    expect(mail.subject).toMatch(/đã có tài khoản/);
    expect(mailer.lastCodeFor("an@gmail.com")).toBeNull();
    for (const guess of ["000000", "123456", "999999"]) {
      expect((await signUpVerify(res.body.ticket, guess)).body.error.code).toBe("CODE_INVALID");
    }
    expect(await users()).toHaveLength(1);
  });

  it("wrong code → CODE_INVALID with attempts left; 5th miss → GONE", async () => {
    const started = await signUpStart(FORM);
    const code = mailer.lastCodeFor("an@gmail.com")!;
    const wrong = code === "000000" ? "111111" : "000000";
    const first = await signUpVerify(started.body.ticket, wrong);
    expect(first.status).toBe(422);
    expect(first.body.error).toMatchObject({ code: "CODE_INVALID", attemptsLeft: 4 });
    for (let i = 0; i < 3; i++) await signUpVerify(started.body.ticket, wrong);
    expect((await signUpVerify(started.body.ticket, wrong)).status).toBe(410);
    expect((await signUpVerify(started.body.ticket, code)).status).toBe(410);
    expect(await users()).toHaveLength(0);
  });

  it("validates the code format", async () => {
    const started = await signUpStart(FORM);
    for (const code of ["12345", "1234567", "abcdef", ""]) {
      expect((await signUpVerify(started.body.ticket, code)).status).toBe(400);
    }
  });

  it("resend waits 60 seconds and answers with retryAfter", async () => {
    const started = await signUpStart(FORM);
    const res = await call(resend, "POST", "/api/auth/codes/resend", { body: { ticket: started.body.ticket } });
    expect(res.status).toBe(429);
    expect(res.body.error.retryAfter).toBeGreaterThan(0);
    expect((await call(resend, "POST", "/api/auth/codes/resend", { body: { ticket: "nope" } })).status).toBe(410);
  });

  it("two people racing for the same username or e-mail → one account, one 409", async () => {
    const a = await signUpStart({ ...FORM, email: "a@gmail.com" });
    const codeA = mailer.lastCodeFor("a@gmail.com")!;
    const b = await signUpStart({ ...FORM, email: "b@gmail.com" });
    const codeB = mailer.lastCodeFor("b@gmail.com")!;
    expect((await signUpVerify(a.body.ticket, codeA)).status).toBe(201);
    const lost = await signUpVerify(b.body.ticket, codeB);
    expect(lost.status).toBe(409);
    expect(await users()).toHaveLength(1);

    await resetTestDb();
    const c = await signUpStart({ ...FORM, username: "nguoi_mot", email: "same@gmail.com" });
    const codeC = mailer.lastCodeFor("same@gmail.com")!;
    const d = await signUpStart({ ...FORM, username: "nguoi_hai", email: "same@gmail.com" }); // replaces c's code
    const codeD = mailer.lastCodeFor("same@gmail.com")!;
    expect((await signUpVerify(c.body.ticket, codeC)).status).toBe(410);
    expect((await signUpVerify(d.body.ticket, codeD)).status).toBe(201);
  });

  it("rejects a cross-site start (Origin check) and reports a missing mail setup", async () => {
    expect((await signUpStart(FORM, { origin: "https://evil.example" })).status).toBe(403);
    setMailerForTests(null);
    const res = await signUpStart(FORM);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("MAIL_UNAVAILABLE");
  });

  it("the old one-step POST /api/auth/register is gone", () => {
    expect(fs.existsSync(path.resolve(__dirname, "../../src/app/api/auth/register/route.ts"))).toBe(false);
  });
});
