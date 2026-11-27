import { describe, expect, it } from "vitest";
import { chromeIntentUrl, detectInAppBrowser, isAndroid } from "@/lib/in-app-browser";

const UA = {
  zaloIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/24.05.01 ZaloTheme/light ZaloLanguage/vn",
  zaloAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 Zalo android/12080000 ZaloTheme/light ZaloLanguage/vi",
  fb: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/466.0.0.36.106;FBBV/600000000]",
  messenger:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/455.0.0.44.88;]",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 333.0.4.29.94",
  safari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it("recognises Zalo on iOS and Android", () => {
    expect(detectInAppBrowser(UA.zaloIos)).toBe("zalo");
    expect(detectInAppBrowser(UA.zaloAndroid)).toBe("zalo");
  });

  it("recognises Facebook, Messenger and Instagram", () => {
    expect(detectInAppBrowser(UA.fb)).toBe("facebook");
    expect(detectInAppBrowser(UA.messenger)).toBe("facebook");
    expect(detectInAppBrowser(UA.instagram)).toBe("instagram");
  });

  it("leaves real browsers alone", () => {
    expect(detectInAppBrowser(UA.safari)).toBeNull();
    expect(detectInAppBrowser(UA.chrome)).toBeNull();
  });
});

describe("chromeIntentUrl", () => {
  it("builds an intent that opens the same page in Chrome, falling back to the page", () => {
    const url = chromeIntentUrl("https://memory-save.vercel.app/camera?x=1");
    expect(url).toBe(
      "intent://memory-save.vercel.app/camera?x=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fmemory-save.vercel.app%2Fcamera%3Fx%3D1;end",
    );
  });

  it("refuses non-web links", () => {
    expect(chromeIntentUrl("javascript:alert(1)")).toBeNull();
    expect(chromeIntentUrl("not a url")).toBeNull();
  });

  it("knows Android", () => {
    expect(isAndroid(UA.zaloAndroid)).toBe(true);
    expect(isAndroid(UA.zaloIos)).toBe(false);
  });
});
