// 005 research R2–R4 — e-mail codes: single use, 5 wrong tries, 10-minute expiry, 60-second resend, send limits.
// data-model.md › email_codes, email_sends
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { installMemoryMailer, type MemoryMailer } from "../helpers/memory-mailer";
import { getDb, schema } from "@/server/db/client";
import { setMailerForTests } from "@/server/mail/mailer";
import { checkCode, claimCode, issueCode, resendCode } from "@/server/services/email-codes";
import { ticketHash } from "@/server/domain/email-code";
import { AppError } from "@/server/http/errors";

const EMAIL = "an@gmail.com";
const IP = "203.0.113.7";

async function expectError(p: Promise<unknown>, code: string, status?: number): Promise<AppError> {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  const e = err as AppError;
  expect(e.code).toBe(code);
  if (status) expect(e.status).toBe(status);
  return e;
}

async function issue(overrides: Partial<Parameters<typeof issueCode>[0]> = {}) {
  return issueCode({ purpose: "signup", email: EMAIL, ip: IP, delivery: "code", ...overrides });
}

async function age(ticket: string, seconds: number) {
  await getDb()
    .update(schema.emailCodes)
    .set({
      sentAt: sql`sent_at - make_interval(secs => ${seconds})`,
      expiresAt: sql`expires_at - make_interval(secs => ${seconds})`,
    })
    .where(eq(schema.emailCodes.ticketHash, ticketHash(ticket)));
}

describe("e-mail codes", () => {
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

  it("sends a code that works exactly once", async () => {
    const { ticket } = await issue();
    const code = mailer.lastCodeFor(EMAIL)!;
    expect(code).toMatch(/^[0-9]{6}$/);
    const row = await checkCode({ ticket, code, purpose: "signup" });
    expect(row.email).toBe(EMAIL);
    await getDb().transaction(async (tx) => {
      await claimCode(tx, ticket);
    });
    await expectError(checkCode({ ticket, code, purpose: "signup" }), "GONE", 410);
  });

  it("counts wrong codes, then kills the code on the 5th miss", async () => {
    const { ticket } = await issue();
    const code = mailer.lastCodeFor(EMAIL)!;
    const wrong = code === "000000" ? "111111" : "000000";
    for (const left of [4, 3, 2, 1]) {
      const e = await expectError(checkCode({ ticket, code: wrong, purpose: "signup" }), "CODE_INVALID", 422);
      expect(e.extra?.attemptsLeft).toBe(left);
    }
    await expectError(checkCode({ ticket, code: wrong, purpose: "signup" }), "GONE", 410);
    // even the right code is useless now
    await expectError(checkCode({ ticket, code, purpose: "signup" }), "GONE", 410);
  });

  it("rejects an expired code, another purpose, someone else's code and a made-up ticket", async () => {
    const { ticket } = await issue();
    const code = mailer.lastCodeFor(EMAIL)!;
    await expectError(checkCode({ ticket, code, purpose: "reset_password" }), "GONE");
    await expectError(checkCode({ ticket: "made-up-ticket", code, purpose: "signup" }), "GONE");

    const own = await issue({ purpose: "change_email", email: "b@gmail.com", userId: null });
    const ownCode = mailer.lastCodeFor("b@gmail.com")!;
    await expectError(
      checkCode({ ticket: own.ticket, code: ownCode, purpose: "change_email", userId: "00000000-0000-0000-0000-000000000000" }),
      "GONE",
    );

    await age(ticket, 601);
    await expectError(checkCode({ ticket, code, purpose: "signup" }), "GONE");
  });

  it("makes resend wait 60 seconds, then replaces the code", async () => {
    const { ticket } = await issue();
    const first = mailer.lastCodeFor(EMAIL)!;
    const e = await expectError(resendCode({ ticket, ip: IP }), "RATE_LIMITED", 429);
    expect(e.extra?.retryAfter).toBeGreaterThan(55);

    await age(ticket, 61);
    await resendCode({ ticket, ip: IP });
    const second = mailer.lastCodeFor(EMAIL)!;
    expect(mailer.to(EMAIL)).toHaveLength(2);
    if (second !== first) await expectError(checkCode({ ticket, code: first, purpose: "signup" }), "CODE_INVALID");
    expect((await checkCode({ ticket, code: second, purpose: "signup" })).email).toBe(EMAIL);
  });

  it("brings a dead or expired code back with resend", async () => {
    const { ticket } = await issue();
    await age(ticket, 700); // expired and past the cooldown
    await resendCode({ ticket, ip: IP });
    const code = mailer.lastCodeFor(EMAIL)!;
    expect((await checkCode({ ticket, code, purpose: "signup" })).email).toBe(EMAIL);
  });

  it("only lets the requester resend a change-email code", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    await getDb().execute(sql`
      insert into users (id, username, password_hash, display_name, handle, invite_token)
      values (${userId}, 'owner_one', 'h', 'Owner', 'owner.1234', 'token-owner-00000000000')`);
    const { ticket } = await issue({ purpose: "change_email", userId });
    await age(ticket, 61);
    await expectError(resendCode({ ticket, ip: IP, sessionUserId: "22222222-2222-4222-8222-222222222222" }), "GONE");
    await expectError(resendCode({ ticket, ip: IP }), "GONE");
    await resendCode({ ticket, ip: IP, sessionUserId: userId });
  });

  it("starting again cancels the previous code for the same purpose and e-mail", async () => {
    const a = await issue();
    const codeA = mailer.lastCodeFor(EMAIL)!;
    await issue();
    await expectError(checkCode({ ticket: a.ticket, code: codeA, purpose: "signup" }), "GONE");
  });

  it("limits sends to 5 per e-mail and 20 per IP per hour", async () => {
    for (let i = 0; i < 5; i++) await issue();
    await expectError(issue(), "RATE_LIMITED", 429);

    await resetTestDb();
    for (let i = 0; i < 20; i++) await issue({ email: `u${i}@gmail.com` });
    await expectError(issue({ email: "other@gmail.com" }), "RATE_LIMITED", 429);
    // another IP is not affected
    await issue({ email: "other@gmail.com", ip: "198.51.100.1" });
  });

  it("decoy codes never match and their mail has no code", async () => {
    const { ticket } = await issue({ delivery: "email_taken" });
    const mail = mailer.to(EMAIL).at(-1)!;
    expect(mail.subject).toMatch(/đã có tài khoản/);
    expect(mailer.lastCodeFor(EMAIL)).toBeNull();
    for (let i = 0; i < 4; i++) {
      await expectError(checkCode({ ticket, code: String(i).repeat(6), purpose: "signup" }), "CODE_INVALID");
    }
  });

  it("'none' delivery sends nothing but still counts toward the limit", async () => {
    await issue({ purpose: "reset_password", delivery: "none" });
    expect(mailer.sent).toHaveLength(0);
    const [{ n }] = await getDb().select({ n: sql<number>`count(*)::int` }).from(schema.emailSends);
    expect(n).toBe(1);
  });

  it("reports SMTP failures without spending the limit or leaving a code", async () => {
    mailer.fail = true;
    await expectError(issue(), "MAIL_FAILED", 502);
    const codes = await getDb().select().from(schema.emailCodes);
    const sends = await getDb().select().from(schema.emailSends);
    expect(codes).toHaveLength(0);
    expect(sends).toHaveLength(0);
  });

  it("says the feature is unavailable when no mailer is configured", async () => {
    setMailerForTests(null);
    await expectError(issue(), "MAIL_UNAVAILABLE", 503);
  });
});
