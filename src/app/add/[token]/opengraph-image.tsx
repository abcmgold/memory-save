import { OG_CONTENT_TYPE, OG_SIZE, renderShareCard } from "@/server/og/card";
import { inviterNameByToken } from "@/server/services/invites";
import { SITE_NAME } from "@/lib/share-text";

// Invite-link share image with the inviter's display name (003 FR-S07); unknown token → generic card (FR-S08)
export const alt = `Lời mời kết bạn trên ${SITE_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const inviter = await inviterNameByToken((await params).token);
  return renderShareCard(inviter ? { name: inviter.displayName, seed: inviter.id } : null);
}
