// npm run dev:local — run MemorySave with no cloud accounts:
// embedded Postgres (PGlite) exposed on 127.0.0.1:5433 + photos on disk, both in ~/.memorysave-local
// (outside the project, so Turbopack does not recompile on every database write).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { legacyLocalDataDir, localDataDir } from "../src/lib/local-data-dir";

const PORT = 5433;

async function main() {
  const dir = localDataDir();
  const legacy = legacyLocalDataDir();
  if (!fs.existsSync(path.join(dir, "pglite")) && fs.existsSync(path.join(legacy, "pglite"))) {
    // One-time move from the old in-project folder; the old copy is kept until you delete it.
    fs.mkdirSync(dir, { recursive: true });
    fs.cpSync(legacy, dir, { recursive: true });
    console.log(`→ Copied local data from ${legacy} to ${dir} (you can delete the old .data/ folder).`);
  }
  fs.mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(path.join(dir, "pglite"));
  await migrate(drizzle({ client: db }), { migrationsFolder: "./drizzle" });
  const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 10 });
  await server.start();
  console.log(`✓ Local Postgres (PGlite) on 127.0.0.1:${PORT} — data in ${dir}`);

  const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      MS_LOCAL: "1",
      DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`,
    },
  });

  const shutdown = async () => {
    child.kill();
    await server.stop().catch(() => {});
    await db.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  child.on("exit", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
