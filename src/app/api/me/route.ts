import { route, json } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { toUserRef } from "@/server/services/auth";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  // `username` and `googleEmail` are returned to their owner only (FR-038, 002 FR-G09)
  return json({
    user: toUserRef(user),
    username: user.username,
    googleEmail: user.googleEmail,
    lastAudience: user.lastAudience,
  });
});
