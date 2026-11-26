import { route, json, readJson, clientIp } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { EmailOnlyBody } from "@/server/http/schemas";
import { startEmailChange } from "@/server/services/account-email";
import { CODE_TTL_SEC, RESEND_AFTER_SEC } from "@/server/domain/email-code";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/me/email/start
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { email } = EmailOnlyBody.parse(await readJson(req));
  const { ticket } = await startEmailChange(user.id, email, clientIp(req));
  return json({ ticket, resendIn: RESEND_AFTER_SEC, expiresIn: CODE_TTL_SEC }, { status: 202 });
});
