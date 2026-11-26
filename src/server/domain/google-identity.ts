// Pure — 002-google-login research R2 + data-model.md › Quy tắc kiểm tra. No I/O, no randomness.
import { createHash } from "node:crypto";
import { MAX_DISPLAY_NAME } from "@/lib/messages";

export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;
const CLOCK_SKEW_S = 60;

export type GoogleIdentity = { sub: string; email: string; name: string };
export type ClaimsResult = { ok: true; identity: GoogleIdentity } | { ok: false; reason: "invalid" | "unverified" };

/**
 * Validates the claims of an ID token received directly from Google's token endpoint over TLS
 * (OIDC Core §3.1.3.7 lets TLS stand in for the signature check in the code flow).
 */
export function checkGoogleClaims(claims: unknown, clientId: string, nowMs: number): ClaimsResult {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return { ok: false, reason: "invalid" };
  const c = claims as Record<string, unknown>;
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  const valid =
    typeof c.iss === "string" &&
    (GOOGLE_ISSUERS as readonly string[]).includes(c.iss) &&
    aud.includes(clientId) &&
    typeof c.exp === "number" &&
    c.exp + CLOCK_SKEW_S > nowMs / 1000 &&
    typeof c.sub === "string" &&
    c.sub.length > 0 &&
    c.sub.length <= 255 &&
    typeof c.email === "string" &&
    c.email.length > 0 &&
    c.email.length <= 320;
  if (!valid) return { ok: false, reason: "invalid" };
  if (c.email_verified !== true && c.email_verified !== "true") return { ok: false, reason: "unverified" };
  return {
    ok: true,
    identity: { sub: c.sub as string, email: c.email as string, name: typeof c.name === "string" ? c.name : "" },
  };
}

/** Payload of a JWT (no signature check — see checkGoogleClaims). Throws on malformed input. */
export function decodeJwtPayload(jwt: string): unknown {
  const parts = jwt.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) throw new Error("Malformed JWT");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });

/** Display name suggested from Google's profile: trimmed, single spaces, ≤ 50 chars, never half a letter. */
export function suggestDisplayName(name: unknown): string {
  if (typeof name !== "string") return "";
  const clean = name.normalize("NFC").replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_DISPLAY_NAME) return clean;
  let out = "";
  for (const { segment } of segmenter.segment(clean)) {
    if (out.length + segment.length > MAX_DISPLAY_NAME) break;
    out += segment;
  }
  return out.trimEnd();
}

/** PKCE S256 code challenge (RFC 7636 §4.2). */
export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
