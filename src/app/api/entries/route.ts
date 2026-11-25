import { route, json, readJson } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { errors } from "@/server/http/errors";
import { CreateEntryBody } from "@/server/http/entry-schemas";
import { createEntry, listMine } from "@/server/services/entries";
import { listShared } from "@/server/services/moments";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const input = CreateEntryBody.parse(await readJson(req));
  const entry = await createEntry(user.id, input);
  return json({ entry }, { status: 201 });
});

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "mine";
  const cursor = url.searchParams.get("cursor");
  if (scope === "mine") return json(await listMine(user.id, { cursor, date: url.searchParams.get("date") }));
  if (scope === "friends") return json(await listShared(user.id, { cursor }));
  throw errors.validation();
});
