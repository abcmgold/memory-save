import { route, json, readJson, clientIp } from "@/server/http/request";
import { EmailOnlyBody } from "@/server/http/schemas";
import { startReset } from "@/server/services/password-reset";
import { CODE_TTL_SEC, RESEND_AFTER_SEC } from "@/server/domain/email-code";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/auth/password-reset/start — same 202 whether or not the e-mail has an account
export const POST = route(async (req) => {
  const { email } = EmailOnlyBody.parse(await readJson(req));
  const { ticket } = await startReset(email, clientIp(req));
  return json({ ticket, resendIn: RESEND_AFTER_SEC, expiresIn: CODE_TTL_SEC }, { status: 202 });
});
