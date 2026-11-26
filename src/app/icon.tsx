import { renderAppIcon } from "@/server/og/app-icon";

// Served at /icon/192 and /icon/512 — the sizes src/app/manifest.ts lists (003 FR-S10)
const SIZES = [192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  return renderAppIcon(SIZES.includes(size as (typeof SIZES)[number]) ? size : 192);
}
