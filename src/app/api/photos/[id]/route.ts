import { route, noContent } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { errors } from "@/server/http/errors";
import { uuidParam } from "@/server/http/schemas";
import { deleteUnattached } from "@/server/services/photos";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = uuidParam.safeParse((await params).id);
  if (!id.success) throw errors.notFound();
  await deleteUnattached(user.id, id.data);
  return noContent();
});
