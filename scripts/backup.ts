// npm run backup → backups/memorysave-YYYYMMDD-HHmmss/{db.dump, photos/…, manifest.json}  (research.md R13, SC-007)
import fs from "node:fs";
import path from "node:path";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { loadEnvFiles } from "./load-env";
import { pgPool, r2Client, requireEnv, runTool, timestamp } from "./lib/cloud";

async function main() {
  loadEnvFiles();
  const dbUrl = requireEnv("DATABASE_URL");
  const bucket = requireEnv("R2_BUCKET");
  const dir = path.resolve("backups", `memorysave-${timestamp()}`);
  fs.mkdirSync(path.join(dir, "photos"), { recursive: true });

  console.log(`→ Dumping database to ${path.join(dir, "db.dump")}`);
  runTool("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", path.join(dir, "db.dump"), dbUrl]);

  console.log(`→ Downloading photos from R2 bucket "${bucket}"`);
  const s3 = r2Client();
  let token: string | undefined;
  let objects = 0;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "photos/", ContinuationToken: token }));
    for (const obj of page.Contents ?? []) {
      if (!obj.Key) continue;
      const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
      const target = path.join(dir, obj.Key);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, Buffer.from(await out.Body!.transformToByteArray()));
      objects++;
      if (objects % 50 === 0) console.log(`  ${objects} objects…`);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  const pool = pgPool(dbUrl);
  const counts: Record<string, number> = {};
  try {
    for (const table of ["users", "entries", "photos", "friendships", "entry_audience"]) {
      const { rows } = await pool.query(`select count(*)::int as n from ${table}`);
      counts[table] = rows[0].n;
    }
  } finally {
    await pool.end();
  }

  const manifest = { createdAt: new Date().toISOString(), bucket, objects, counts };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Backup complete: ${dir}`);
  console.log(`  rows: ${JSON.stringify(counts)}  objects: ${objects}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
