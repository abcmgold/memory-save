import { route, json } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { friendsOverview } from "@/server/services/friends";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await friendsOverview(user.id));
});
