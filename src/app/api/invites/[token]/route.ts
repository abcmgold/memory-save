import { route, json, readCookie } from "@/server/http/request";
import { getSessionUser, SESSION_COOKIE } from "@/server/services/sessions";
import { lookupInvite } from "@/server/services/invites";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

/** Public: shows who sent the link (display name + handle only). Signing in is not required to look. */
export const GET = route<Ctx>(async (req, { params }) => {
  const viewer = await getSessionUser(readCookie(req, SESSION_COOKIE));
  return json(await lookupInvite((await params).token, viewer?.id ?? null));
});
