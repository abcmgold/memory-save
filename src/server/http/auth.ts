import "server-only";
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

/** Server Components: the signed-in user or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
}
