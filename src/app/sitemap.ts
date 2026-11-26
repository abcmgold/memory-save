import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The only public, indexable pages (004 FR-L05)
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: new URL("/", base).toString(), changeFrequency: "monthly", priority: 1 },
    { url: new URL("/login", base).toString(), changeFrequency: "yearly", priority: 0.5 },
  ];
}
