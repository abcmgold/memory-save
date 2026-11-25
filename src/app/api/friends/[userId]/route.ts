import { route, noContent } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { uuidFrom } from "@/server/http/params";
import { unfriend } from "@/server/services/friends";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ userId: string }> };

export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  await unfriend(user.id, await uuidFrom(params, "userId"));
  return noContent();
});
