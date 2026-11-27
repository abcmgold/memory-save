// Pure — recognise the browsers built into chat/social apps (Zalo, Facebook, Messenger, Instagram, LINE, TikTok) and
// build the link that hands the page to the phone's real browser. Their web views break things the app relies on
// (the in-page camera is forced into a full-screen player, sign-in sessions live only inside the chat app), so the
// whole site offers to reopen in the default browser (components/InAppBrowserGate.tsx).

export type InAppBrowser = "zalo" | "facebook" | "instagram" | "line" | "tiktok";

const PATTERNS: [InAppBrowser, RegExp][] = [
  ["zalo", /\bZalo/i],
  ["facebook", /\bFBA[NV]\/|\bFB_IAB\/|\bFBIOS|\bMessenger/i],
  ["instagram", /\bInstagram\b/i],
  ["line", /\bLine\/\d/i],
  ["tiktok", /\b(?:musical_ly|BytedanceWebview|TikTok)/i],
];

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  for (const [name, re] of PATTERNS) if (re.test(userAgent)) return name;
  return null;
}

export const IN_APP_LABEL: Record<InAppBrowser, string> = {
  zalo: "Zalo",
  facebook: "Facebook",
  instagram: "Instagram",
  line: "LINE",
  tiktok: "TikTok",
};

export type MobileOs = "android" | "ios" | "other";

export function mobileOs(userAgent: string): MobileOs {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "other";
}

/** iOS major version from the user agent ("iPhone OS 17_5" → 17), or null. */
export function iosMajor(userAgent: string): number | null {
  const m = /\bOS (\d+)[_.]\d+/.exec(userAgent);
  return m && /iPhone|iPad|iPod/i.test(userAgent) ? Number(m[1]) : null;
}

/**
 * A link that asks the system to open `href` in the default browser, or null when the platform has none:
 * - Android: an intent:// link for VIEW + BROWSABLE (the system picks the default browser); if nothing handles it,
 *   the web view falls back to the page itself.
 * - iOS 17+: the x-safari-https:// scheme opens Safari. Older iOS has no such link — the user must use the app's menu.
 */
export function externalBrowserUrl(href: string, userAgent: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const scheme = url.protocol.slice(0, -1);
  const os = mobileOs(userAgent);
  if (os === "android") {
    const fallback = encodeURIComponent(url.href);
    return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${fallback};end`;
  }
  if (os === "ios" && (iosMajor(userAgent) ?? 0) >= 17) {
    return `x-safari-${url.href}`;
  }
  return null;
}
