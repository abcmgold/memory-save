import { route, noContent, readCookie, isHttps } from "@/server/http/request";
import { clearSessionCookie, deleteSession, SESSION_COOKIE } from "@/server/services/sessions";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  await deleteSession(readCookie(req, SESSION_COOKIE));
  return noContent({ "Set-Cookie": clearSessionCookie(isHttps(req)) });
});
