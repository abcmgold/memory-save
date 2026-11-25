import { route, noContent } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { uuidFrom } from "@/server/http/params";
import { cancelRequest } from "@/server/services/friends";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ userId: string }> };

/** Cancel a request I sent. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  await cancelRequest(user.id, await uuidFrom(params, "userId"));
  return noContent();
});
