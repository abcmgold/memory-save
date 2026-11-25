// npm run dev:local — run MemorySave with no cloud accounts:
// embedded Postgres (PGlite, data in .data/pglite) exposed on 127.0.0.1:5433, photos in .data/photos.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const PORT = 5433;

async function main() {
  fs.mkdirSync(path.resolve(".data"), { recursive: true });
  const db = await PGlite.create(path.resolve(".data/pglite"));
  await migrate(drizzle({ client: db }), { migrationsFolder: "./drizzle" });
  const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 10 });
  await server.start();
  console.log(`✓ Local Postgres (PGlite) on 127.0.0.1:${PORT} — data in .data/pglite`);

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
