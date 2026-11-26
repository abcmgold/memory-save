import { route, json, readJson, clientIp } from "@/server/http/request";
import { SignupStartBody } from "@/server/http/schemas";
import { startSignup } from "@/server/services/email-signup";
import { CODE_TTL_SEC, RESEND_AFTER_SEC } from "@/server/domain/email-code";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/auth/register/start
export const POST = route(async (req) => {
  const input = SignupStartBody.parse(await readJson(req));
  const { ticket } = await startSignup(input, clientIp(req));
  return json({ ticket, resendIn: RESEND_AFTER_SEC, expiresIn: CODE_TTL_SEC }, { status: 202 });
});
