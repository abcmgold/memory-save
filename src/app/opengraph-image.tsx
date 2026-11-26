import { OG_CONTENT_TYPE, OG_SIZE, renderShareCard } from "@/server/og/card";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/share-text";

// Default share image for every page (003 FR-S06)
export const alt = `${SITE_NAME} — ${SITE_DESCRIPTION}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderShareCard();
}
