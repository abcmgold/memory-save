import { route, json, readJson, isHttps } from "@/server/http/request";
import { CodeVerifyBody } from "@/server/http/schemas";
import { verifySignup } from "@/server/services/email-signup";
import { createSession, sessionCookie } from "@/server/services/sessions";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/auth/register/verify
export const POST = route(async (req) => {
  const { ticket, code } = CodeVerifyBody.parse(await readJson(req));
  const { user, next } = await verifySignup(ticket, code);
  const { token, expiresAt } = await createSession(user.id);
  return json({ user, next }, { status: 201, headers: { "Set-Cookie": sessionCookie(token, expiresAt, isHttps(req)) } });
});
