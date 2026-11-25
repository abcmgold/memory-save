// npm run restore -- backups/memorysave-YYYYMMDD-HHmmss
// Restores into an EMPTY database (RESTORE_DATABASE_URL) and a bucket (RESTORE_R2_BUCKET) — never over live data.
import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { loadEnvFiles } from "./load-env";
import { pgPool, r2Client, requireEnv, runTool } from "./lib/cloud";

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full) : [full];
  });
}

async function main() {
  loadEnvFiles();
  const src = process.argv[2];
  if (!src || !fs.existsSync(path.join(src, "db.dump"))) {
    console.error("Usage: npm run restore -- <backup folder containing db.dump>");
    process.exit(1);
  }
  const target = requireEnv("RESTORE_DATABASE_URL");
  const bucket = requireEnv("RESTORE_R2_BUCKET");
  if (target === process.env.DATABASE_URL) {
    console.error("RESTORE_DATABASE_URL must not be the live DATABASE_URL. Restore into an empty database, verify, then switch.");
    process.exit(1);
  }

  const pool = pgPool(target);
  try {
    const { rows } = await pool.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
    );
    if (rows[0].n > 0) {
      console.error("The target database is not empty. Use a fresh, empty database (e.g. a new Neon database).");
      process.exit(1);
    }
  } finally {
    await pool.end();
  }

  console.log("→ Restoring database");
  runTool("pg_restore", ["--no-owner", "--no-privileges", "--dbname", target, path.join(src, "db.dump")]);

  console.log(`→ Uploading photos to bucket "${bucket}"`);
  const s3 = r2Client();
  const files = walk(path.join(src, "photos"));
  for (const [i, file] of files.entries()) {
    const key = path.relative(src, file).split(path.sep).join("/");
    const contentType = key.endsWith(".webp") ? "image/webp" : "application/octet-stream";
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.readFileSync(file), ContentType: contentType }));
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${files.length}`);
  }

  // Verify: every photo row has its folder of objects.
  const check = pgPool(target);
  try {
    const { rows } = await check.query("select id::text from photos where status <> 'uploading'");
    const folders = new Set(files.map((f) => path.relative(src, f).split(path.sep)[1]));
    const missing = rows.filter((r: { id: string }) => !folders.has(r.id));
    const manifestPath = path.join(src, "manifest.json");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
    console.log(`\n✓ Restored ${rows.length} photo rows, ${files.length} objects.`);
    if (manifest) console.log(`  Backup manifest counts: ${JSON.stringify(manifest.counts)}`);
    if (missing.length) {
      console.warn(`! ${missing.length} photo rows have no objects in the backup.`);
      process.exitCode = 2;
    }
    console.log("Next: point DATABASE_URL / R2_BUCKET (Vercel → Settings → Environment Variables) to the restored copy and redeploy.");
  } finally {
    await check.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
