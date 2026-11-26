// Fake Google token endpoint for tests (002 research R8): no network, configurable claims or failure.
import type { GoogleOAuthClient } from "@/server/services/google-oauth";

export const TEST_GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
export const TEST_GOOGLE_CLIENT_SECRET = "test-client-secret";

export function googleClaims(patch: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: TEST_GOOGLE_CLIENT_ID,
    iat: now,
    exp: now + 3600,
    sub: "google-sub-1",
    email: "an@gmail.com",
    email_verified: true,
    name: "An Nguyễn",
    ...patch,
  };
}

export class FakeGoogle implements GoogleOAuthClient {
  claims: Record<string, unknown> = googleClaims();
  fail: Error | null = null;
  calls: { code: string; verifier: string; redirectUri: string }[] = [];

  async exchangeCode(input: { code: string; verifier: string; redirectUri: string }): Promise<unknown> {
    this.calls.push(input);
    if (this.fail) throw this.fail;
    return this.claims;
  }
}

/** Value of one cookie among a response's Set-Cookie headers (undefined if not set). */
export function setCookieValue(headers: Headers, name: string): string | undefined {
  for (const c of headers.getSetCookie()) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (pair.slice(0, idx).trim() === name) return decodeURIComponent(pair.slice(idx + 1));
  }
  return undefined;
}

/** Full Set-Cookie line for one cookie (to check attributes). */
export function setCookieLine(headers: Headers, name: string): string | undefined {
  return headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

/** Path + query of a redirect's Location header. */
export function locationOf(headers: Headers): string {
  const loc = headers.get("location");
  if (!loc) throw new Error("No Location header");
  const url = new URL(loc, "http://localhost:3000");
  return url.origin === "http://localhost:3000" ? url.pathname + url.search : url.toString();
}
