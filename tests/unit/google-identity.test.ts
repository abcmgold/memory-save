// 002-google-login research R2 + data-model.md › Quy tắc kiểm tra
import { describe, expect, it } from "vitest";
import {
  checkGoogleClaims,
  codeChallenge,
  decodeJwtPayload,
  suggestDisplayName,
} from "@/server/domain/google-identity";

const CLIENT = "client-123.apps.googleusercontent.com";
const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const sec = (ms: number) => Math.floor(ms / 1000);

const good = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: sec(NOW) + 3600,
  iat: sec(NOW),
  sub: "1234567890",
  email: "an@gmail.com",
  email_verified: true,
  name: "An Nguyễn",
};

describe("checkGoogleClaims", () => {
  it("accepts valid claims and returns the identity", () => {
    expect(checkGoogleClaims(good, CLIENT, NOW)).toEqual({
      ok: true,
      identity: { sub: "1234567890", email: "an@gmail.com", name: "An Nguyễn" },
    });
    expect(checkGoogleClaims({ ...good, iss: "accounts.google.com" }, CLIENT, NOW).ok).toBe(true);
    expect(checkGoogleClaims({ ...good, aud: [CLIENT, "other"] }, CLIENT, NOW).ok).toBe(true);
    expect(checkGoogleClaims({ ...good, email_verified: "true" }, CLIENT, NOW).ok).toBe(true);
    const noName = checkGoogleClaims({ ...good, name: undefined }, CLIENT, NOW);
    expect(noName.ok && noName.identity.name).toBe("");
  });

  it.each([
    ["wrong issuer", { iss: "https://evil.example" }],
    ["wrong audience", { aud: "someone-else" }],
    ["expired beyond the 60 s skew", { exp: sec(NOW) - 61 }],
    ["missing exp", { exp: undefined }],
    ["missing sub", { sub: undefined }],
    ["empty sub", { sub: "" }],
    ["missing email", { email: undefined }],
  ])("rejects %s as invalid", (_label, patch) => {
    expect(checkGoogleClaims({ ...good, ...patch }, CLIENT, NOW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("tolerates up to 60 s of clock skew", () => {
    expect(checkGoogleClaims({ ...good, exp: sec(NOW) - 59 }, CLIENT, NOW).ok).toBe(true);
  });

  it.each([false, "false", undefined])("rejects email_verified=%s as unverified (FR-G05)", (v) => {
    expect(checkGoogleClaims({ ...good, email_verified: v }, CLIENT, NOW)).toEqual({ ok: false, reason: "unverified" });
  });

  it("rejects non-objects", () => {
    for (const v of [null, undefined, "x", 42, []]) {
      expect(checkGoogleClaims(v, CLIENT, NOW)).toEqual({ ok: false, reason: "invalid" });
    }
  });
});

describe("decodeJwtPayload", () => {
  it("decodes the base64url payload of a JWT", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "1", name: "Lan Đỗ" })).toString("base64url");
    expect(decodeJwtPayload(`eyJhbGciOiJSUzI1NiJ9.${payload}.sig`)).toEqual({ sub: "1", name: "Lan Đỗ" });
  });
  it.each(["", "abc", "a.b", "a.!!!.c", `a.${Buffer.from("not json").toString("base64url")}.c`])(
    "throws on malformed token %j",
    (t) => {
      expect(() => decodeJwtPayload(t)).toThrow();
    },
  );
});

describe("suggestDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(suggestDisplayName("  An   Nguyễn \n")).toBe("An Nguyễn");
  });
  it("returns an empty string when there is no usable name", () => {
    expect(suggestDisplayName("")).toBe("");
    expect(suggestDisplayName("   ")).toBe("");
    expect(suggestDisplayName(undefined)).toBe("");
    expect(suggestDisplayName(123)).toBe("");
  });
  it("cuts to 50 characters without splitting a Vietnamese letter", () => {
    // decomposed (NFD) input: each "ễ" is 3 code units — must come back normalized and whole
    const long = "Nguyễn ".repeat(10).normalize("NFD");
    const out = suggestDisplayName(long);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out).toBe(out.normalize("NFC"));
    expect(out.endsWith(" ")).toBe(false);
    expect(out.startsWith("Nguyễn Nguyễn")).toBe(true);
    expect(suggestDisplayName("a".repeat(80))).toBe("a".repeat(50));
  });
});

describe("codeChallenge (PKCE S256)", () => {
  it("matches RFC 7636 appendix B", () => {
    expect(codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});
