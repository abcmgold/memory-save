// 003-seo-sharing FR-S01, FR-S02 — contracts/http.md › Chuyển hướng sớm
// 004-landing-page FR-L01, FR-L06, FR-L07 — contracts/routes.md › Hành vi theo route
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

const ORIGIN = "https://memory-save.example";
const req = (url: string, cookie?: string) =>
  new NextRequest(ORIGIN + url, { headers: cookie === undefined ? {} : { cookie } });
const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

/** Every page URL under src/app/(app), with dynamic segments filled in. */
function appPageUrls(): string[] {
  const root = path.resolve(__dirname, "../../src/app/(app)");
  const out: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const seg = entry.name.startsWith("(") ? null : entry.name.replace(/^\[.*\]$/, "abc123");
        walk(path.join(dir, entry.name), seg ? [...segments, seg] : segments);
      } else if (entry.name === "page.tsx") {
        out.push("/" + segments.join("/"));
      }
    }
  };
  walk(root, []);
  return out;
}

describe("proxy: early 307 for private pages", () => {
  it("shows the public landing page at / to signed-out visitors", () => {
    const res = proxy(req("/"));
    expect(getRedirectUrl(res)).toBeNull();
    expect(res.status).toBe(200);
  });

  it("sends signed-in visitors of / straight to the camera", () => {
    const res = proxy(req("/", "ms_session=some-token"));
    expect(res.status).toBe(307);
    expect(getRedirectUrl(res)).toBe(`${ORIGIN}/camera`);
  });

  it("sends signed-out visitors of /camera to /login with next", () => {
    const res = proxy(req("/camera"));
    expect(res.status).toBe(307);
    expect(new URL(getRedirectUrl(res)!).searchParams.get("next")).toBe("/camera");
  });

  it("keeps the requested path + query as next", () => {
    const res = proxy(req("/journal/abc?d=2026-11-01"));
    expect(res.status).toBe(307);
    const url = new URL(getRedirectUrl(res)!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/journal/abc?d=2026-11-01");
  });

  it("treats an empty session cookie as signed out", () => {
    expect(proxy(req("/me", "ms_session=")).status).toBe(307);
    expect(proxy(req("/me", "other=1")).status).toBe(307);
  });

  it("lets requests with a session cookie through (the page still checks the session)", () => {
    const res = proxy(req("/me", "ms_session=some-token"));
    expect(getRedirectUrl(res)).toBeNull();
    expect(res.status).toBe(200);
  });

  it("covers every page under src/app/(app)", () => {
    const urls = appPageUrls();
    expect(urls).toEqual(expect.arrayContaining(["/camera", "/journal", "/journal/new", "/journal/abc123", "/me", "/moments"]));
    expect(urls).not.toContain("/"); // "/" is the public landing page, outside (app)
    for (const url of urls) expect(matches(url), url).toBe(true);
  });

  it.each([
    "/login",
    "/login?next=/me",
    "/login/google",
    "/add/token123",
    "/api/me",
    "/api/auth/google/callback",
    "/robots.txt",
    "/manifest.webmanifest",
    "/icon/192",
    "/apple-icon",
    "/opengraph-image",
    "/add/token123/opengraph-image",
    "/favicon.ico",
    "/_next/static/chunks/app.js",
  ])("never runs on public route %s", (url) => {
    expect(matches(url)).toBe(false);
  });
});
