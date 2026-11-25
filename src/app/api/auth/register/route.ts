import { route, json, readJson, isHttps } from "@/server/http/request";
import { RegisterBody } from "@/server/http/schemas";
import { registerUser } from "@/server/services/auth";
import { createSession, sessionCookie } from "@/server/services/sessions";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const input = RegisterBody.parse(await readJson(req));
  const user = await registerUser(input);
  const { token, expiresAt } = await createSession(user.id);
  return json({ user }, { status: 201, headers: { "Set-Cookie": sessionCookie(token, expiresAt, isHttps(req)) } });
});
