import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "@/server/db/schema";
import { setDbForTests, type Db } from "@/server/db/client";

let client: PGlite | null = null;
let db: Db | null = null;

/** Starts an in-process Postgres (PGlite), applies the real migrations and routes getDb() to it. */
export async function setupTestDb(): Promise<Db> {
  if (!db) {
    client = new PGlite();
    const instance = drizzle({ client, schema });
    await migrate(instance, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
    db = instance as unknown as Db;
  }
  setDbForTests(db);
  return db;
}

/** Empties every table between tests (keeps the schema). */
export async function resetTestDb(): Promise<void> {
  if (!db) return;
  await db.execute(
    sql`TRUNCATE entry_audience, photos, entries, friendships, friend_requests, login_attempts, sessions, pending_google_signups, users CASCADE`,
  );
}

export async function closeTestDb(): Promise<void> {
  setDbForTests(null);
  await client?.close();
  client = null;
  db = null;
}
