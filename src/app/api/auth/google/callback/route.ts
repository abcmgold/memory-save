import { originOf } from "@/server/http/request";
import { handleCallback } from "@/server/services/google-login";

export const runtime = "nodejs";

// 002 contracts/api.md › GET /api/auth/google/callback — always a redirect, never JSON
export async function GET(req: Request): Promise<Response> {
  let result;
  try {
    result = await handleCallback(req);
  } catch (err) {
    console.error("[google-login] callback crashed", err instanceof Error ? err.name : "unknown");
    result = { location: "/login?error=google_failed", cookies: [] };
  }
  const headers = new Headers({ "Cache-Control": "no-store", Location: new URL(result.location, originOf(req)).toString() });
  for (const c of result.cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
