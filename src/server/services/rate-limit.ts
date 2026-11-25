import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "../db/client";

// data-model.md › login_attempts: ≥ 5 failures within 15 minutes blocks login (FR-003)
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60_000;

export async function isLoginBlocked(username: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.username, username), gt(schema.loginAttempts.attemptedAt, since)));
  return (row?.n ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(username: string): Promise<void> {
  await getDb().insert(schema.loginAttempts).values({ username });
}

export async function clearFailures(username: string): Promise<void> {
  await getDb().delete(schema.loginAttempts).where(eq(schema.loginAttempts.username, username));
}

export async function deleteOldAttempts(): Promise<number> {
  const rows = await getDb()
    .delete(schema.loginAttempts)
    .where(lt(schema.loginAttempts.attemptedAt, new Date(Date.now() - WINDOW_MS)))
    .returning({ id: schema.loginAttempts.id });
  return rows.length;
}
