import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { errors } from "./errors";
import { readCookie } from "./request";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "../services/sessions";

/** Route Handlers: the signed-in user or a 401 (session re-checked on every request). */
export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(readCookie(req, SESSION_COOKIE));
  if (!user) throw errors.unauthenticated();
  return user;
}

/**
 * Server Components: the signed-in user or null.
 * Wrapped in React `cache()` so the layout's nav and the page share ONE session lookup per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
});
