import { route, json } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { errors } from "@/server/http/errors";
import { uuidParam } from "@/server/http/schemas";
import { completeUpload } from "@/server/services/photos";

export const runtime = "nodejs";
// Decoding/re-encoding a 10 MB photo (and HEIC conversion) can take a few seconds.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = uuidParam.safeParse((await params).id);
  if (!id.success) throw errors.notFound();
  const photo = await completeUpload(user.id, id.data);
  return json({ photo });
});
