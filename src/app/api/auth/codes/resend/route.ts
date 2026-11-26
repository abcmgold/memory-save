import { route, json, readJson, readCookie, clientIp } from "@/server/http/request";
import { ResendBody } from "@/server/http/schemas";
import { resendCode } from "@/server/services/email-codes";
import { getSessionUser, SESSION_COOKIE } from "@/server/services/sessions";
import { CODE_TTL_SEC, RESEND_AFTER_SEC } from "@/server/domain/email-code";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/auth/codes/resend — any purpose; change-email codes only for their requester.
export const POST = route(async (req) => {
  const { ticket } = ResendBody.parse(await readJson(req));
  const user = await getSessionUser(readCookie(req, SESSION_COOKIE));
  await resendCode({ ticket, ip: clientIp(req), sessionUserId: user?.id ?? null });
  return json({ resendIn: RESEND_AFTER_SEC, expiresIn: CODE_TTL_SEC }, { status: 202 });
});
