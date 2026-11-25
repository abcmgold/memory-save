import { route, json } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { acceptInvite } from "@/server/services/invites";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const inviter = await acceptInvite((await params).token, user.id);
  return json({ status: "friends", inviter });
});
