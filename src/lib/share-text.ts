// Pure — texts for titles and share cards (003 research R5). Shared by metadata, Open Graph images and the UI.
export const SITE_NAME = "MemorySave";
export const SITE_DESCRIPTION = "Ghi lại từng ngày, chia sẻ khoảnh khắc với người thân.";
/** Open Graph fields every page shares. A page's own `openGraph` replaces the layout's, so pages spread this in. */
export const OPEN_GRAPH_DEFAULTS = { siteName: SITE_NAME, locale: "vi_VN", type: "website" } as const;

export const INVITE_FALLBACK_TITLE = "Lời mời kết bạn · MemorySave";
export const INVITE_FALLBACK_DESCRIPTION = "Bấm link để kết bạn trên MemorySave — nhật ký và khoảnh khắc riêng tư với người thân.";

export function inviteShareTitle(displayName: string): string {
  return `${displayName.trim()} mời bạn kết bạn trên ${SITE_NAME}`;
}

export function inviteShareDescription(displayName: string): string {
  return `Bấm để kết bạn với ${displayName.trim()} và cùng lưu giữ những khoảnh khắc riêng tư trên ${SITE_NAME}.`;
}

/** Font size (px) for the inviter's name on a 1200×630 card: big for short names, ≥ 48 px for 50 characters. */
export function cardNameFontSize(name: string): number {
  const n = [...name.trim()].length;
  if (n <= 12) return 96;
  if (n <= 20) return 80;
  if (n <= 30) return 64;
  return 52;
}

/** Same hash as the app's <Avatar>, so a person has the same colour everywhere. */
export const AVATAR_TONE_COUNT = 6;
export function avatarToneIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % AVATAR_TONE_COUNT;
}
