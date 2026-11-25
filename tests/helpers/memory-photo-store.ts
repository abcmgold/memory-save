import type { PhotoStore, PresignedPut } from "@/server/storage/photo-store";

type Obj = { body: Buffer; contentType: string };

/** In-memory PhotoStore for tests. `simulateClientPut` stands in for the browser's PUT to R2. */
export class MemoryPhotoStore implements PhotoStore {
  objects = new Map<string, Obj>();
  /** Declared Content-Length per presigned key, like R2 enforcing the signed header. */
  signedLengths = new Map<string, number>();

  async presignPut(key: string, opts: { contentType: string; contentLength: number; expiresInSec: number }): Promise<PresignedPut> {
    this.signedLengths.set(key, opts.contentLength);
    return {
      url: `memory://put/${key}`,
      method: "PUT",
      headers: { "Content-Type": opts.contentType, "Content-Length": String(opts.contentLength) },
      expiresAt: new Date(Date.now() + opts.expiresInSec * 1000).toISOString(),
    };
  }

  async presignGet(key: string, opts: { expiresInSec: number; signingDate?: Date }): Promise<string> {
    return `memory://get/${key}?expires=${opts.expiresInSec}${opts.signingDate ? `&date=${opts.signingDate.getTime()}` : ""}`;
  }

  async head(key: string) {
    const o = this.objects.get(key);
    return o ? { size: o.body.length, contentType: o.contentType } : null;
  }

  async get(key: string) {
    return this.objects.get(key)?.body ?? null;
  }

  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }

  async delete(keys: string[]) {
    for (const k of keys) this.objects.delete(k);
  }

  async list(prefix: string) {
    return [...this.objects.keys()].filter((k) => k.startsWith(prefix));
  }

  /** Mimics the browser PUT to a presigned URL; rejects a length that differs from the signed one. */
  simulateClientPut(url: string, body: Buffer, contentType: string): void {
    const key = url.replace(/^memory:\/\/put\//, "");
    const signed = this.signedLengths.get(key);
    if (signed === undefined) throw new Error("No presigned URL for " + key);
    if (signed !== body.length) throw new Error("SignatureDoesNotMatch: Content-Length differs");
    this.objects.set(key, { body, contentType });
  }
}
