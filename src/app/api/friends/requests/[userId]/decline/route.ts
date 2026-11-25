import { route, noContent } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { uuidFrom } from "@/server/http/params";
import { declineRequest } from "@/server/services/friends";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ userId: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  await declineRequest(user.id, await uuidFrom(params, "userId"));
  return noContent();
});
