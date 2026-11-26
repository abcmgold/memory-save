import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 003 research R3: /add/ and private pages are NOT disallowed here — link-preview bots that honour robots.txt must be
// able to read the share card, and crawlers must be able to see the noindex tag. Private pages answer 307 (proxy).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
