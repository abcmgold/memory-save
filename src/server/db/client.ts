import "server-only";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "./schema";
import { getEnv } from "../env";

export type Db = NeonDatabase<typeof schema>;
/** Either the db itself or an open transaction — services accept both. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { __msDb?: Db; __msTestDb?: Db };

function isNeon(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/**
 * Shared Drizzle client. Neon → serverless Pool over WebSocket (interactive transactions);
 * any other Postgres (local mode, self-hosted) → node-postgres. Same schema and query API.
 */
export function getDb(): Db {
  if (globalForDb.__msTestDb) return globalForDb.__msTestDb;
  if (!globalForDb.__msDb) {
    const url = getEnv().DATABASE_URL;
    globalForDb.__msDb = isNeon(url)
      ? drizzleNeon({ client: new NeonPool({ connectionString: url, max: 5 }), schema })
      : (drizzlePg({ client: new PgPool({ connectionString: url, max: 5 }), schema }) as unknown as Db);
  }
  return globalForDb.__msDb;
}

/** Test hook: route every getDb() call to the given database (PGlite). Pass null to clear. */
export function setDbForTests(db: unknown | null): void {
  globalForDb.__msTestDb = (db as Db) ?? undefined;
}

export { schema };
