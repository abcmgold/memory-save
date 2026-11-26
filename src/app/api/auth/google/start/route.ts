import { route, originOf } from "@/server/http/request";
import { buildStart } from "@/server/services/google-login";

export const runtime = "nodejs";

// 002 contracts/api.md › GET /api/auth/google/start
export const GET = route(async (req) => {
  const result = buildStart(req, new URL(req.url).searchParams.get("next"));
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (!result) {
    headers.set("Location", new URL("/login", originOf(req)).toString()); // not configured (FR-G01)
    return new Response(null, { status: 302, headers });
  }
  headers.set("Location", result.location);
  for (const c of result.cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
});
