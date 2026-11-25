import { z } from "zod";
import { route, json, readJson } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { sendRequest } from "@/server/services/friends";

export const runtime = "nodejs";

const Body = z.object({ handle: z.string().min(1).max(100) });

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { handle } = Body.parse(await readJson(req));
  const result = await sendRequest(user.id, handle);
  return json({ status: result.status }, { status: result.created ? 201 : 200 });
});
