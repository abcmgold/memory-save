import { route, json, readJson } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { CodeVerifyBody } from "@/server/http/schemas";
import { verifyEmailChange } from "@/server/services/account-email";

export const runtime = "nodejs";

// 005 contracts/api.md › POST /api/me/email/verify
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { ticket, code } = CodeVerifyBody.parse(await readJson(req));
  return json(await verifyEmailChange(user.id, ticket, code));
});
