import "server-only";
import { after } from "next/server";
import { and, count, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { getDb, schema, type DbOrTx } from "../db/client";
import { errors } from "../http/errors";
import { getMailer, type Mailer } from "../mail/mailer";
import { codeMail, emailTakenMail, googleAccountMail, type MailContent } from "../mail/templates";
import {
  CODE_TTL_SEC,
  codeHash,
  MAX_ATTEMPTS,
  newCode,
  newTicket,
  resendWaitSeconds,
  sameHash,
  SENDS_PER_EMAIL_HOUR,
  SENDS_PER_IP_HOUR,
  ticketHash,
} from "../domain/email-code";
import { msg } from "@/lib/messages";

// 005 research R2–R4; data-model.md › email_codes, email_sends; contracts/api.md (CODE_INVALID, GONE, RATE_LIMITED…)
type Purpose = schema.CodePurpose;
type Delivery = schema.CodeDelivery;

const HOUR_MS = 3_600_000;

export type IssueInput = {
  purpose: Purpose;
  email: string; // already normalized and validated
  ip: string;
  /** What the mail says: the code, or a mail without a usable code (R4). */
  delivery: Delivery;
  userId?: string | null;
  payload?: schema.SignupPayload | null;
};

function composeMail(purpose: Purpose, delivery: Delivery, code: string): MailContent | null {
  switch (delivery) {
    case "code":
      return codeMail(purpose, code);
    case "email_taken":
      return emailTakenMail();
    case "google_account":
      return googleAccountMail();
    case "none":
      return null;
  }
}

/**
 * Forgot-password mails go out after the response so its timing never tells whether the address has an account
 * (R4). Tests run outside a request, so there the work simply runs inline.
 */
function sendsAfterResponse(purpose: Purpose): boolean {
  return purpose === "reset_password" && process.env.NODE_ENV !== "test";
}

function requireMailer(): Mailer {
  const mailer = getMailer();
  if (!mailer) throw errors.mailUnavailable();
  return mailer;
}

async function assertSendAllowed(email: string, ip: string): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - HOUR_MS);
  const [[byEmail], [byIp]] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.emailSends)
      .where(and(eq(schema.emailSends.email, email), gt(schema.emailSends.sentAt, since))),
    db
      .select({ n: count() })
      .from(schema.emailSends)
      .where(and(eq(schema.emailSends.ip, ip), gt(schema.emailSends.sentAt, since))),
  ]);
  if ((byEmail?.n ?? 0) >= SENDS_PER_EMAIL_HOUR || (byIp?.n ?? 0) >= SENDS_PER_IP_HOUR) {
    throw errors.rateLimited(msg.tooManyCodes);
  }
}

/** SMTP error code only — the message can quote the recipient address, which must not reach the logs. */
function smtpReason(err: unknown): string {
  const e = err as { code?: unknown; responseCode?: unknown };
  return `code=${String(e?.code ?? "unknown").slice(0, 30)} response=${String(e?.responseCode ?? "-").slice(0, 5)}`;
}

/**
 * Sends (or schedules) one mail. A failed synchronous send throws MAIL_FAILED and is not counted toward the limits;
 * the caller undoes its own row change. Deferred sends are counted up front and only logged on failure.
 */
async function deliver(mailer: Mailer, input: { purpose: Purpose; email: string; ip: string; mail: MailContent | null }) {
  const record = () => getDb().insert(schema.emailSends).values({ email: input.email, ip: input.ip });
  const { mail } = input;
  if (!mail) return void (await record());
  if (sendsAfterResponse(input.purpose)) {
    await record();
    after(async () => {
      try {
        await mailer.send({ ...mail, to: input.email });
      } catch (err) {
        console.warn(`[mail] deferred send failed: ${smtpReason(err)}`);
      }
    });
    return;
  }
  try {
    await mailer.send({ ...mail, to: input.email });
  } catch (err) {
    console.warn(`[mail] send failed: ${smtpReason(err)}`);
    throw errors.mailFailed();
  }
  await record();
}

/** Creates a code for `email` and mails it. Returns the ticket the browser must send back (R2). */
export async function issueCode(input: IssueInput): Promise<{ ticket: string }> {
  const mailer = requireMailer();
  await assertSendAllowed(input.email, input.ip);
  const db = getDb();
  const userId = input.userId ?? null;

  // Starting again replaces the previous code for the same purpose + e-mail (+ requester).
  await db
    .delete(schema.emailCodes)
    .where(
      and(
        eq(schema.emailCodes.purpose, input.purpose),
        eq(schema.emailCodes.email, input.email),
        userId ? eq(schema.emailCodes.userId, userId) : isNull(schema.emailCodes.userId),
      ),
    );

  const ticket = newTicket();
  const code = newCode();
  const now = new Date();
  const tHash = ticketHash(ticket);
  await db.insert(schema.emailCodes).values({
    ticketHash: tHash,
    purpose: input.purpose,
    email: input.email,
    userId,
    // Without a real code in the mail, store a random one nobody ever sees: every guess fails (R4).
    codeHash: codeHash(ticket, input.delivery === "code" ? code : newCode() + "x"),
    delivery: input.delivery,
    payload: input.payload ?? null,
    sentAt: now,
    expiresAt: new Date(now.getTime() + CODE_TTL_SEC * 1000),
  });

  try {
    await deliver(mailer, { purpose: input.purpose, email: input.email, ip: input.ip, mail: composeMail(input.purpose, input.delivery, code) });
  } catch (err) {
    await db.delete(schema.emailCodes).where(eq(schema.emailCodes.ticketHash, tHash));
    throw err;
  }
  return { ticket };
}

async function findRow(ticket: string): Promise<schema.EmailCodeRow | undefined> {
  if (!ticket || ticket.length > 100) return undefined;
  const [row] = await getDb().select().from(schema.emailCodes).where(eq(schema.emailCodes.ticketHash, ticketHash(ticket)));
  return row;
}

/**
 * POST /api/auth/codes/resend — a new code on the same ticket after 60 seconds; also revives an expired or dead code.
 * A change-email code can only be resent by the account that asked for it.
 */
export async function resendCode(input: { ticket: string; ip: string; sessionUserId?: string | null }): Promise<void> {
  const row = await findRow(input.ticket);
  if (!row || (row.userId && row.purpose === "change_email" && row.userId !== input.sessionUserId)) {
    throw errors.gone(msg.codeExpired);
  }
  const wait = resendWaitSeconds(row.sentAt, new Date());
  if (wait > 0) throw errors.rateLimited(msg.codeWait(wait), wait);
  const mailer = requireMailer();
  await assertSendAllowed(row.email, input.ip);

  const code = newCode();
  const now = new Date();
  const db = getDb();
  const previous = { codeHash: row.codeHash, attempts: row.attempts, sentAt: row.sentAt, expiresAt: row.expiresAt };
  await db
    .update(schema.emailCodes)
    .set({
      codeHash: codeHash(input.ticket, row.delivery === "code" ? code : newCode() + "x"),
      attempts: 0,
      sentAt: now,
      expiresAt: new Date(now.getTime() + CODE_TTL_SEC * 1000),
    })
    .where(eq(schema.emailCodes.ticketHash, row.ticketHash));
  try {
    await deliver(mailer, { purpose: row.purpose, email: row.email, ip: input.ip, mail: composeMail(row.purpose, row.delivery, code) });
  } catch (err) {
    // Not sent: keep the old code and cooldown as they were (spec edge case "không tính vào thời gian chờ").
    await db.update(schema.emailCodes).set(previous).where(eq(schema.emailCodes.ticketHash, row.ticketHash));
    throw err;
  }
}

/**
 * Checks a code. The wrong-try counter is bumped in its own statement *before* comparing, so a miss is never rolled
 * back and parallel guesses cannot exceed 5 (R3). Returns the row on success; the caller then claims it inside its
 * business transaction with {@link claimCode}.
 */
export async function checkCode(input: {
  ticket: string;
  code: string;
  purpose: Purpose;
  userId?: string | null;
}): Promise<schema.EmailCodeRow> {
  if (!input.ticket || input.ticket.length > 100) throw errors.gone(msg.codeExpired);
  const conditions = [
    eq(schema.emailCodes.ticketHash, ticketHash(input.ticket)),
    eq(schema.emailCodes.purpose, input.purpose),
    lt(schema.emailCodes.attempts, MAX_ATTEMPTS),
    gt(schema.emailCodes.expiresAt, new Date()),
  ];
  if (input.purpose === "change_email") conditions.push(eq(schema.emailCodes.userId, input.userId ?? sql`NULL`));
  const [row] = await getDb()
    .update(schema.emailCodes)
    .set({ attempts: sql`${schema.emailCodes.attempts} + 1` })
    .where(and(...conditions))
    .returning();
  if (!row) throw errors.gone(msg.codeExpired);
  if (sameHash(row.codeHash, codeHash(input.ticket, input.code))) return row;
  const left = MAX_ATTEMPTS - row.attempts;
  throw left > 0 ? errors.codeInvalid(left) : errors.gone(msg.codeExpired);
}

/** Consumes a checked code inside the caller's transaction; a second use (even concurrent) gets GONE. */
export async function claimCode(tx: DbOrTx, ticket: string): Promise<schema.EmailCodeRow> {
  const [row] = await tx
    .delete(schema.emailCodes)
    .where(eq(schema.emailCodes.ticketHash, ticketHash(ticket)))
    .returning();
  if (!row) throw errors.gone(msg.codeExpired);
  return row;
}

/** Cron cleanup (data-model.md › email_codes, email_sends lifecycle). */
export async function deleteExpiredCodes(): Promise<number> {
  const rows = await getDb()
    .delete(schema.emailCodes)
    .where(lt(schema.emailCodes.expiresAt, new Date(Date.now() - HOUR_MS))) // keep an hour so "resend" can revive it
    .returning({ t: schema.emailCodes.ticketHash });
  return rows.length;
}

export async function deleteOldSends(): Promise<number> {
  const rows = await getDb()
    .delete(schema.emailSends)
    .where(lt(schema.emailSends.sentAt, new Date(Date.now() - HOUR_MS)))
    .returning({ id: schema.emailSends.id });
  return rows.length;
}
