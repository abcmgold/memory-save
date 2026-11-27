import { describe, expect, it } from "vitest";
import { detectInAppBrowser, externalBrowserUrl, iosMajor, mobileOs } from "@/lib/in-app-browser";

const UA = {
  zaloIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/24.05.01 ZaloTheme/light ZaloLanguage/vn",
  zaloIosOld:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/24.05.01",
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
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
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
    expect(detectInAppBrowser(UA.desktop)).toBeNull();
  });
});

describe("platform", () => {
  it("knows the OS and iOS version", () => {
    expect(mobileOs(UA.zaloAndroid)).toBe("android");
    expect(mobileOs(UA.zaloIos)).toBe("ios");
    expect(mobileOs(UA.desktop)).toBe("other");
    expect(iosMajor(UA.zaloIos)).toBe(17);
    expect(iosMajor(UA.zaloIosOld)).toBe(16);
    expect(iosMajor(UA.zaloAndroid)).toBeNull();
  });
});

describe("externalBrowserUrl", () => {
  const page = "https://memory-save.vercel.app/add/abc?x=1";

  it("Android: a VIEW intent for the default browser, falling back to the page", () => {
    expect(externalBrowserUrl(page, UA.zaloAndroid)).toBe(
      "intent://memory-save.vercel.app/add/abc?x=1#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=https%3A%2F%2Fmemory-save.vercel.app%2Fadd%2Fabc%3Fx%3D1;end",
    );
  });

  it("iOS 17+: the Safari scheme; older iOS has none", () => {
    expect(externalBrowserUrl(page, UA.zaloIos)).toBe("x-safari-https://memory-save.vercel.app/add/abc?x=1");
    expect(externalBrowserUrl(page, UA.zaloIosOld)).toBeNull();
  });

  it("nothing on desktop, nothing for non-web links", () => {
    expect(externalBrowserUrl(page, UA.desktop)).toBeNull();
    expect(externalBrowserUrl("javascript:alert(1)", UA.zaloAndroid)).toBeNull();
    expect(externalBrowserUrl("not a url", UA.zaloAndroid)).toBeNull();
  });
});
