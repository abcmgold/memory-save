import { route, json, readJson, noContent } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { errors } from "@/server/http/errors";
import { uuidParam } from "@/server/http/schemas";
import { UpdateEntryBody } from "@/server/http/entry-schemas";
import { deleteEntry, getEntryForViewer, updateEntry } from "@/server/services/entries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function entryId(params: Ctx["params"]): Promise<string> {
  const parsed = uuidParam.safeParse((await params).id);
  if (!parsed.success) throw errors.notFound();
  return parsed.data;
}

export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  return json({ entry: await getEntryForViewer(user.id, await entryId(params)) });
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = await entryId(params);
  const patch = UpdateEntryBody.parse(await readJson(req));
  return json({ entry: await updateEntry(user.id, id, patch) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteEntry(user.id, await entryId(params));
  return noContent();
});
