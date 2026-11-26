// 004-landing-page FR-L02, FR-L04 — research R3, R4; contracts/routes.md › Thẻ <head> của /
import { describe, expect, it } from "vitest";
import {
  FAQ,
  FEATURES,
  jsonLd,
  jsonLdScript,
  LANDING_DESCRIPTION,
  LANDING_INTRO,
  LANDING_TITLE,
  STEPS,
} from "@/lib/landing-content";
import { metadata } from "@/app/page";

describe("landing content", () => {
  it("has the 4 key features, 3 steps and a FAQ", () => {
    expect(FEATURES).toHaveLength(4);
    expect(STEPS).toHaveLength(3);
    expect(FAQ.length).toBeGreaterThanOrEqual(4);
    for (const item of [...FEATURES, ...STEPS]) {
      expect(item.title.trim()).not.toBe("");
      expect(item.body.trim()).not.toBe("");
    }
    for (const q of FAQ) {
      expect(q.question.endsWith("?")).toBe(true);
      expect(q.answer.trim()).not.toBe("");
    }
  });

  it("keeps the on-page intro separate from the factual search description", () => {
    expect(LANDING_INTRO).not.toBe(LANDING_DESCRIPTION);
    expect(LANDING_DESCRIPTION).toMatch(/Miễn phí/);
  });

  it("mentions privacy-by-default (Constitution II is the product's promise)", () => {
    expect(JSON.stringify(FEATURES)).toMatch(/Chỉ mình tôi/);
  });
});

describe("structured data", () => {
  it("describes a free Vietnamese web app at an absolute URL", () => {
    const d = jsonLd("https://memory-save.example");
    expect(d).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "MemorySave",
      url: "https://memory-save.example/",
      inLanguage: "vi",
      isAccessibleForFree: true,
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
    });
    expect(d.description).toBe(LANDING_DESCRIPTION);
  });

  it("escapes < so the JSON cannot close the script tag", () => {
    expect(jsonLdScript({ x: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});

describe("landing page metadata", () => {
  it("is indexable with its own title, canonical / and og:url /", () => {
    expect(metadata.title).toEqual({ absolute: LANDING_TITLE });
    expect(metadata.description).toBe(LANDING_DESCRIPTION);
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.robots).toBeUndefined();
    expect(metadata.openGraph).toMatchObject({ url: "/", siteName: "MemorySave", locale: "vi_VN" });
  });
});
