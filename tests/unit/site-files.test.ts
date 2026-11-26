// 003-seo-sharing FR-S04, FR-S05, FR-S10 — contracts/http.md
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import manifest from "@/app/manifest";
import { generateImageMetadata as iconSizes } from "@/app/icon";
import { metadata as appLayoutMetadata } from "@/app/(app)/layout";
import { metadata as loginMetadata } from "@/app/login/page";
import { metadata as rootMetadata } from "@/app/layout";
import { SITE_DESCRIPTION } from "@/lib/share-text";

describe("robots.txt", () => {
  it("allows public pages, blocks the API and points to the sitemap", () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
    expect(r.sitemap).toMatch(/^https?:\/\/[^/]+\/sitemap\.xml$/);
  });
});

describe("sitemap.xml (004 FR-L05)", () => {
  it("lists the landing page and the login page with absolute URLs", () => {
    const entries = sitemap();
    expect(entries.map((e) => new URL(e.url).pathname)).toEqual(["/", "/login"]);
    expect(entries[0]).toMatchObject({ priority: 1, changeFrequency: "monthly" });
    expect(entries[1]).toMatchObject({ priority: 0.5, changeFrequency: "yearly" });
  });
});

describe("indexing", () => {
  it("marks every signed-in page noindex via the (app) layout", () => {
    expect(appLayoutMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps /login indexable with its own description", () => {
    expect(loginMetadata.robots).toBeUndefined();
    expect(loginMetadata.description).toBeTruthy();
    expect(loginMetadata.description).not.toBe(SITE_DESCRIPTION);
    expect(loginMetadata.alternates?.canonical).toBe("/login"); // folds ?next= / ?error= variants (004 FR-L09)
  });
});

describe("manifest (FR-S10)", () => {
  it("installs as a standalone MemorySave app with 192/512 icons that exist", () => {
    const m = manifest();
    expect(m).toMatchObject({
      name: "MemorySave",
      short_name: "MemorySave",
      lang: "vi",
      start_url: "/camera",
      display: "standalone",
      background_color: "#fbf6ec",
      theme_color: "#fbf6ec",
    });
    expect(m.icons).toEqual([
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ]);
    // The URLs above are served by src/app/icon.tsx's generateImageMetadata ids
    expect(iconSizes().map((i) => [i.id, i.size])).toEqual([
      ["192", { width: 192, height: 192 }],
      ["512", { width: 512, height: 512 }],
    ]);
  });
});

describe("default share card", () => {
  it("has absolute URLs and Vietnamese Open Graph defaults", () => {
    expect(rootMetadata.metadataBase?.toString()).toMatch(/^https?:\/\//);
    expect(rootMetadata.openGraph).toMatchObject({ siteName: "MemorySave", locale: "vi_VN", type: "website" });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
