import { route } from "@/server/http/request";
import { requireUser } from "@/server/http/auth";
import { errors } from "@/server/http/errors";
import { uuidParam } from "@/server/http/schemas";
import { signedVariantUrl } from "@/server/services/photos";
import type { PhotoVariant } from "@/server/storage/photo-store";

export const runtime = "nodejs";

const VARIANTS = new Set<PhotoVariant>(["thumb", "display", "original"]);
type Ctx = { params: Promise<{ id: string; variant: string }> };

/** Every view is access-checked, then redirected to a 60-second signed URL (research.md R5). */
export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id, variant } = await params;
  const parsed = uuidParam.safeParse(id);
  if (!parsed.success || !VARIANTS.has(variant as PhotoVariant)) throw errors.notFound();
  const url = await signedVariantUrl(user.id, parsed.data, variant as PhotoVariant);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
});
