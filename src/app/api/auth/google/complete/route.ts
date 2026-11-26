import { route, json, readJson, readCookie, isHttps } from "@/server/http/request";
import { GoogleCompleteBody } from "@/server/http/schemas";
import { clearSignupCookie, completeSignup, SIGNUP_COOKIE, startSession } from "@/server/services/google-login";

export const runtime = "nodejs";

// 002 contracts/api.md › POST /api/auth/google/complete (Origin-checked by route())
export const POST = route(async (req) => {
  const { displayName } = GoogleCompleteBody.parse(await readJson(req));
  const { user, next, created } = await completeSignup(readCookie(req, SIGNUP_COOKIE), displayName);
  const headers = new Headers();
  headers.append("Set-Cookie", await startSession(user.id, req));
  headers.append("Set-Cookie", clearSignupCookie(isHttps(req)));
  return json({ user, next }, { status: created ? 201 : 200, headers });
});
