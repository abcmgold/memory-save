import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { getDb, schema, type DbOrTx } from "../db/client";
import { errors } from "../http/errors";
import type { UserRef } from "@/lib/types";
import { normalizeUsername } from "../domain/username";
import { formatHandle, handleBase } from "../domain/handle";
import { clearFailures, isLoginBlocked, recordFailure } from "./rate-limit";

export type { UserRef };

/** Public view of a user — never includes the username (FR-038). */
export function toUserRef(u: { id: string; handle: string; displayName: string | null }): UserRef {
  return { id: u.id, handle: u.handle, displayName: u.displayName?.trim() || u.handle };
}

/** Postgres error details survive Drizzle's error wrapping in `cause`. */
export function pgError(err: unknown): { code?: string; constraint?: string } {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return { code: e?.code ?? e?.cause?.code, constraint: e?.constraint ?? e?.cause?.constraint };
}

export function newInviteToken(): string {
  return randomBytes(18).toString("base64url"); // 144 bits (FR-039)
}

function randomDigits(n: number): string {
  return String(randomInt(0, 10 ** n)).padStart(n, "0");
}

// Argon2id with library defaults (memory-hard); algorithm 2 = Argon2id.
const ARGON_OPTS = { algorithm: 2 as const };
// Used to spend the same time when the username does not exist (no user enumeration by timing).
let dummyHash: string | null = null;

/** Argon2id hash for a new password (sign-up, password reset). */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

type NewUser = Omit<typeof schema.users.$inferInsert, "id" | "handle" | "inviteToken"> & { displayName: string };

/**
 * Inserts a user with a freshly allocated public handle and invite token (FR-037, FR-039).
 * Retries only on handle/token collisions; every other error (e.g. a taken username or Google account) is rethrown.
 */
export async function insertUser(values: NewUser, db: DbOrTx = getDb()): Promise<schema.UserRow> {
  const base = handleBase(values.displayName);
  // FR-037: "<base>.<4 digits>", widening to 5–6 digits if the short space is crowded.
  for (let attempt = 0; attempt < 10; attempt++) {
    const handle = formatHandle(base, randomDigits(attempt < 5 ? 4 : attempt < 8 ? 5 : 6));
    try {
      const [user] = await db
        .insert(schema.users)
        .values({ ...values, handle, inviteToken: newInviteToken() })
        .returning();
      return user;
    } catch (err) {
      const { code, constraint } = pgError(err);
      const collision = constraint === "users_handle_unique" || constraint === "users_invite_token_unique";
      if (code !== "23505" || !collision) throw err;
    }
  }
  throw new Error("Could not allocate a unique handle");
}

export async function authenticate(input: { username: string; password: string }): Promise<UserRef> {
  const username = normalizeUsername(input.username);
  if (await isLoginBlocked(username)) throw errors.rateLimited();
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.username, username));
  let ok = false;
  if (user?.passwordHash) {
    ok = await verify(user.passwordHash, input.password);
  } else {
    dummyHash ??= await hash("memorysave-dummy-password", ARGON_OPTS);
    await verify(dummyHash, input.password);
  }
  if (!ok || !user) {
    await recordFailure(username);
    throw errors.invalidCredentials();
  }
  await clearFailures(username);
  return toUserRef(user);
}
