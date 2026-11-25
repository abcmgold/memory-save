import { route, json } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { getInviteToken, inviteUrl, originOf, rotateInviteToken } from "@/server/services/invites";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json({ url: inviteUrl(originOf(req), await getInviteToken(user.id)) });
});

/** Creates a new link; the previous one stops working at once (FR-039). */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  return json({ url: inviteUrl(originOf(req), await rotateInviteToken(user.id)) });
});
