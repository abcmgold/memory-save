import "server-only";
import { getGoogleConfig } from "../env";
import { decodeJwtPayload } from "../domain/google-identity";

// 002-google-login research R1/R8: the only part that talks to Google; swappable in tests.
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TIMEOUT_MS = 10_000;

export interface GoogleOAuthClient {
  /** Exchanges an authorization code for the ID token's claims (not yet validated). */
  exchangeCode(input: { code: string; verifier: string; redirectUri: string }): Promise<unknown>;
}

export function authorizeUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

class HttpGoogleOAuthClient implements GoogleOAuthClient {
  async exchangeCode({ code, verifier, redirectUri }: { code: string; verifier: string; redirectUri: string }) {
    const config = getGoogleConfig();
    if (!config) throw new Error("Google login is not configured");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    // Never log the body: it may contain tokens.
    if (!res.ok) throw new Error(`Google token endpoint returned ${res.status}`);
    const data = (await res.json()) as { id_token?: unknown };
    if (typeof data.id_token !== "string") throw new Error("Google returned no id_token");
    return decodeJwtPayload(data.id_token);
  }
}

const globalForGoogle = globalThis as unknown as { __msGoogle?: GoogleOAuthClient; __msTestGoogle?: GoogleOAuthClient };

export function getGoogleClient(): GoogleOAuthClient {
  if (globalForGoogle.__msTestGoogle) return globalForGoogle.__msTestGoogle;
  globalForGoogle.__msGoogle ??= new HttpGoogleOAuthClient();
  return globalForGoogle.__msGoogle;
}

/** Test hook: route Google calls to a fake. Pass null to clear. */
export function setGoogleClientForTests(client: GoogleOAuthClient | null): void {
  globalForGoogle.__msTestGoogle = client ?? undefined;
}
