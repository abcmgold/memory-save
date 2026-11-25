import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getEnv } from "../env";
import type { PhotoStore, PresignedPut } from "./photo-store";

// Local mode only: photos on disk under .data/photos, served through /api/local-storage with
// HMAC-signed, expiring URLs — the same contract as R2 presigned URLs (research.md R5–R6).

const ROOT = path.resolve(process.cwd(), ".data");
const KEY_RE = /^photos\/[0-9a-f-]{36}\/(original|display\.webp|thumb\.webp)$/;

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

function fileFor(key: string): string {
  if (!isValidKey(key)) throw new Error("invalid key");
  return path.join(ROOT, ...key.split("/"));
}

export type SignedParams = { key: string; exp: string; op: "put" | "get"; type: string; len?: string };

export function sign(p: SignedParams): string {
  const payload = [p.op, p.key, p.exp, p.type, p.len ?? ""].join("\n");
  return createHmac("sha256", getEnv().CRON_SECRET).update(payload).digest("base64url");
}

export function verify(p: SignedParams, sig: string): boolean {
  if (!isValidKey(p.key) || Number(p.exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sign(p));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

function url(p: SignedParams): string {
  const q = new URLSearchParams({ key: p.key, exp: p.exp, op: p.op, type: p.type, ...(p.len ? { len: p.len } : {}) });
  q.set("sig", sign(p));
  return `/api/local-storage?${q.toString()}`;
}

export class LocalPhotoStore implements PhotoStore {
  async presignPut(key: string, opts: { contentType: string; contentLength: number; expiresInSec: number }): Promise<PresignedPut> {
    const exp = String(Math.floor(Date.now() / 1000) + opts.expiresInSec);
    return {
      url: url({ key, exp, op: "put", type: opts.contentType, len: String(opts.contentLength) }),
      method: "PUT",
      headers: { "Content-Type": opts.contentType },
      expiresAt: new Date(Number(exp) * 1000).toISOString(),
    };
  }

  async presignGet(key: string, opts: { expiresInSec: number; contentType?: string }): Promise<string> {
    const exp = String(Math.floor(Date.now() / 1000) + opts.expiresInSec);
    return url({ key, exp, op: "get", type: opts.contentType ?? "application/octet-stream" });
  }

  async head(key: string) {
    try {
      const st = await fs.stat(fileFor(key));
      return { size: st.size };
    } catch {
      return null;
    }
  }

  async get(key: string) {
    try {
      return await fs.readFile(fileFor(key));
    } catch {
      return null;
    }
  }

  async put(key: string, body: Buffer) {
    const file = fileFor(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }

  async delete(keys: string[]) {
    for (const key of keys) {
      if (!isValidKey(key)) continue;
      await fs.rm(fileFor(key), { force: true });
      await fs.rmdir(path.dirname(fileFor(key))).catch(() => {});
    }
  }

  async list(prefix: string) {
    const dir = path.join(ROOT, "photos");
    const out: string[] = [];
    const ids = await fs.readdir(dir).catch(() => [] as string[]);
    for (const id of ids) {
      for (const name of await fs.readdir(path.join(dir, id)).catch(() => [] as string[])) {
        const key = `photos/${id}/${name}`;
        if (key.startsWith(prefix)) out.push(key);
      }
    }
    return out;
  }
}
