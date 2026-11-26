import type { Metadata, Viewport } from "next";
// Self-hosted Be Vietnam Pro (latin + vietnamese subsets via unicode-range) — no font CDN at build or run time.
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/be-vietnam-pro/900.css";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import { OPEN_GRAPH_DEFAULTS, SITE_DESCRIPTION, SITE_NAME } from "@/lib/share-text";

// 003 contracts/http.md › Thẻ <head>: absolute URLs + default share card for every page
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf6ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">{children}</div>
      </body>
    </html>
  );
}
