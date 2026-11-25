import { route, json } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { toUserRef } from "@/server/services/auth";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  // `username` is returned to its owner only (FR-038)
  return json({ user: toUserRef(user), username: user.username, lastAudience: user.lastAudience });
});
