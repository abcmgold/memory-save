import { route } from "@/server/http/request";
import { errors } from "@/server/http/errors";
import { isLocalMode } from "@/server/env";
import { getPhotoStore } from "@/server/storage/photo-store";
import { verify, type SignedParams } from "@/server/storage/local-photo-store";
import { MAX_PHOTO_BYTES } from "@/lib/messages";

export const runtime = "nodejs";

// Stand-in for R2's presigned URLs in local mode only (`npm run dev:local`). 404 everywhere else.

function params(req: Request, op: "get" | "put"): SignedParams & { sig: string } {
  const q = new URL(req.url).searchParams;
  const p = {
    key: q.get("key") ?? "",
    exp: q.get("exp") ?? "0",
    op,
    type: q.get("type") ?? "",
    len: q.get("len") ?? undefined,
    sig: q.get("sig") ?? "",
  };
  if (q.get("op") !== op || !verify(p, p.sig)) throw errors.notFound();
  return p;
}

export const GET = route(async (req) => {
  if (!isLocalMode()) throw errors.notFound();
  const p = params(req, "get");
  const body = await getPhotoStore().get(p.key);
  if (!body) throw errors.notFound();
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": p.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
});

export const PUT = route(async (req) => {
  if (!isLocalMode()) throw errors.notFound();
  const p = params(req, "put");
  if ((req.headers.get("content-type") ?? "") !== p.type) throw errors.badOrigin();
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length !== Number(p.len) || body.length > MAX_PHOTO_BYTES) throw errors.tooLarge();
  await getPhotoStore().put(p.key, body, p.type);
  return new Response(null, { status: 200 });
});
