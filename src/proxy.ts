import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { HOME_PATH } from "@/lib/routes";

/**
 * Early redirects decided by "is there a session cookie?" alone (no DB) — research 003 R2, 004 R2:
 * - "/" is the public landing page; signed-in visitors go straight to the app (307 → /camera).
 * - Private pages answer a real 307 → /login?next=… before anything renders. Without this the (app) layout has already
 *   started streaming, so a page's redirect() could only answer 200 + a client-side redirect.
 *
 * This is NOT access control: every page and API route still validates the session on each request (Constitution II).
 */
export function proxy(request: NextRequest): NextResponse {
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    return signedIn ? NextResponse.redirect(new URL(HOME_PATH, request.url), 307) : NextResponse.next();
  }
  if (signedIn) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login, 307);
}

// Explicit allow-list (not a negative regex) so public pages, API routes, static files and metadata routes (icons,
// Open Graph images, robots, sitemap, manifest) are never touched. tests/unit/proxy.test.ts checks that every page under
// src/app/(app) is listed here.
export const config = {
  matcher: ["/", "/camera/:path*", "/journal/:path*", "/moments/:path*", "/me/:path*"],
};
