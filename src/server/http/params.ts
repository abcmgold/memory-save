import "server-only";
import { errors } from "./errors";
import { uuidParam } from "./schemas";

/** Resolves a dynamic `[userId]`-style param as a UUID, or 404. */
export async function uuidFrom<K extends string>(params: Promise<Record<K, string>>, key: K): Promise<string> {
  const parsed = uuidParam.safeParse((await params)[key]);
  if (!parsed.success) throw errors.notFound();
  return parsed.data;
}
