// Shared helpers for CLI scripts (run with tsx, outside Next.js — no `server-only` imports here).
import { spawnSync } from "node:child_process";
import { S3Client } from "@aws-sdk/client-s3";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing environment variable ${name} (see .env.example).`);
    process.exit(1);
  }
  return v;
}

export function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: requireEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY") },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function pgPool(url: string): Pool {
  neonConfig.webSocketConstructor = ws;
  return new Pool({ connectionString: url });
}

export function runTool(cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.error && (res.error as NodeJS.ErrnoException).code === "ENOENT") {
    console.error(`\n"${cmd}" was not found. Install the PostgreSQL client tools (same major version as Neon) and retry.`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`\n${cmd} failed with exit code ${res.status}.`);
    process.exit(res.status ?? 1);
  }
}

export function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
