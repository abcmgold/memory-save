import { route, json, readJson, isHttps } from "@/server/http/request";
import { ResetVerifyBody } from "@/server/http/schemas";
import { verifyReset } from "@/server/services/password-reset";
import { createSession, sessionCookie } from "@/server/services/sessions";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/auth/password-reset/verify — new session after every old one is removed
export const POST = route(async (req) => {
  const { ticket, code, password } = ResetVerifyBody.parse(await readJson(req));
  const user = await verifyReset(ticket, code, password);
  const { token, expiresAt } = await createSession(user.id);
  return json({ user }, { headers: { "Set-Cookie": sessionCookie(token, expiresAt, isHttps(req)) } });
});
