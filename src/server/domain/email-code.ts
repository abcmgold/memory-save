// Pure — e-mail normalization and one-time codes (005 research R2, R3; data-model.md › users.email, email_codes).
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export { MAX_EMAIL } from "@/lib/messages";
export const CODE_TTL_SEC = 600; // 10 minutes (FR-E02)
export const RESEND_AFTER_SEC = 60; // FR-E03
export const MAX_ATTEMPTS = 5; // FR-E03
export const SENDS_PER_EMAIL_HOUR = 5; // FR-E03
export const SENDS_PER_IP_HOUR = 20; // FR-E03

// Shared with the browser forms (src/lib/validation.ts).
export { isValidEmail, normalizeEmail } from "@/lib/validation";

/** Random secret handed to the browser; the database only keeps its hash. */
export function newTicket(): string {
  return randomBytes(32).toString("base64url");
}

/** 6 random digits, leading zeros kept. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function ticketHash(ticket: string): string {
  return sha256(ticket);
}

/** The code is hashed together with the ticket, so a leaked row cannot be brute-forced without the browser's ticket. */
export function codeHash(ticket: string, code: string): string {
  return sha256(`${ticket}:${code}`);
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Seconds left before another code may be sent (0 = now). */
export function resendWaitSeconds(sentAt: Date, now: Date): number {
  const left = RESEND_AFTER_SEC * 1000 - (now.getTime() - sentAt.getTime());
  return left <= 0 ? 0 : Math.ceil(left / 1000);
}

export { maskEmail } from "@/lib/mask-email"; // shared with the browser (CodeStep)
