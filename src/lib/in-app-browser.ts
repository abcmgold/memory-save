// Pure — recognise the browsers built into chat/social apps (Zalo, Facebook, Messenger, Instagram, LINE, TikTok).
// Their web views often break the in-page camera: the live <video> is forced into the app's full-screen player
// (iOS web views that don't allow inline playback), so the shutter can never be pressed. The camera then uses the
// phone's own camera app instead.

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

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** Android: an intent link that asks the system to open this page in Chrome (some app web views ignore it). */
export function chromeIntentUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const scheme = url.protocol.slice(0, -1);
  const fallback = encodeURIComponent(url.href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}
