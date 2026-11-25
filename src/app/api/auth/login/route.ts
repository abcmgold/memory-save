import { route, json, readJson, isHttps } from "@/server/http/request";
import { LoginBody } from "@/server/http/schemas";
import { errors } from "@/server/http/errors";
import { authenticate } from "@/server/services/auth";
import { createSession, sessionCookie } from "@/server/services/sessions";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const parsed = LoginBody.safeParse(await readJson(req));
  if (!parsed.success) throw errors.invalidCredentials();
  const user = await authenticate(parsed.data);
  const { token, expiresAt } = await createSession(user.id);
  return json({ user }, { headers: { "Set-Cookie": sessionCookie(token, expiresAt, isHttps(req)) } });
});
