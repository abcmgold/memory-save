import { z } from "zod";
import { route, json, readJson } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { errors } from "@/server/http/errors";
import { requestUpload } from "@/server/services/photos";

export const runtime = "nodejs";

const Body = z.object({ contentType: z.string().max(100), size: z.number().int().positive() });

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) throw errors.validation();
  const result = await requestUpload(user.id, parsed.data);
  return json(result, { status: 201 });
});
