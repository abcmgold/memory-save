// 005 research R2, R3 — pure helpers for e-mail codes; data-model.md › users.email
import { describe, expect, it } from "vitest";
import {
  codeHash,
  isValidEmail,
  maskEmail,
  MAX_EMAIL,
  newCode,
  newTicket,
  normalizeEmail,
  RESEND_AFTER_SEC,
  resendWaitSeconds,
  sameHash,
  ticketHash,
} from "@/server/domain/email-code";

describe("normalizeEmail / isValidEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  An.Nguyen@Gmail.COM ")).toBe("an.nguyen@gmail.com");
  });

  it("accepts normal addresses and rejects broken or overlong ones", () => {
    expect(isValidEmail("an@gmail.com")).toBe(true);
    expect(isValidEmail("an.nguyen+memo@example.vn")).toBe(true);
    expect(isValidEmail("an-gmail.com")).toBe(false);
    expect(isValidEmail("an@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    const long = `${"a".repeat(MAX_EMAIL - "@gmail.com".length + 1)}@gmail.com`;
    expect(long.length).toBe(MAX_EMAIL + 1);
    expect(isValidEmail(long)).toBe(false);
  });

  it("only accepts already-normalized input (callers normalize first)", () => {
    expect(isValidEmail("An@Gmail.com")).toBe(false);
  });
});

describe("codes and hashes", () => {
  it("always produces 6 digits, keeping leading zeros", () => {
    for (let i = 0; i < 300; i++) expect(newCode()).toMatch(/^[0-9]{6}$/);
  });

  it("uses long random tickets", () => {
    const a = newTicket();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).not.toBe(newTicket());
  });

  it("binds the code hash to the ticket", () => {
    expect(codeHash("ticket-a", "123456")).not.toBe(codeHash("ticket-b", "123456"));
    expect(codeHash("ticket-a", "123456")).toBe(codeHash("ticket-a", "123456"));
    expect(ticketHash("ticket-a")).not.toBe(codeHash("ticket-a", "123456"));
  });

  it("compares hashes safely", () => {
    expect(sameHash(codeHash("t", "111111"), codeHash("t", "111111"))).toBe(true);
    expect(sameHash(codeHash("t", "111111"), codeHash("t", "111112"))).toBe(false);
    expect(sameHash("short", codeHash("t", "111111"))).toBe(false);
  });
});

describe("resendWaitSeconds", () => {
  const sent = new Date("2026-11-26T10:00:00Z");
  it("counts down from 60 seconds and reaches 0", () => {
    expect(resendWaitSeconds(sent, sent)).toBe(RESEND_AFTER_SEC);
    expect(resendWaitSeconds(sent, new Date(sent.getTime() + 59_100))).toBe(1);
    expect(resendWaitSeconds(sent, new Date(sent.getTime() + 60_000))).toBe(0);
    expect(resendWaitSeconds(sent, new Date(sent.getTime() + 3_600_000))).toBe(0);
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("an@gmail.com")).toBe("a•@gmail.com");
    expect(maskEmail("nguyenvanan@gmail.com")).toBe("n•••@gmail.com");
    expect(maskEmail("x@y.vn")).toBe("x@y.vn");
  });
});
