import "server-only";
import sharp, { type Metadata, type OutputInfo } from "sharp";
import type { PhotoFormat } from "../db/schema";

// research.md R7 — format detected from content, orientation fixed, metadata (incl. GPS) stripped.

export class UnsupportedImageError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UnsupportedImageError";
  }
}

export type ProcessedImage = {
  format: PhotoFormat; // data-model.md › photos.format
  width: number; // photos.width (after orientation)
  height: number; // photos.height
  display: Buffer; // WebP, longest side ≤ 2048
  thumb: Buffer; // WebP, longest side ≤ 480
};

const DISPLAY_MAX = 2048;
const THUMB_MAX = 480;
// Guard against decompression bombs: ~ 50 megapixels is plenty for phone photos.
const MAX_PIXELS = 50_000_000;

function mapFormat(f: string | undefined): PhotoFormat | null {
  switch (f) {
    case "jpeg":
    case "png":
    case "webp":
    case "heif":
      return f;
    default:
      return null;
  }
}

async function decodeable(input: Buffer): Promise<Buffer> {
  try {
    await sharp(input, { limitInputPixels: MAX_PIXELS }).stats();
    return input;
  } catch {
    // Prebuilt sharp cannot decode HEVC-compressed HEIC; convert to JPEG in pure JS/WASM.
    const { default: convert } = await import("heic-convert");
    try {
      return Buffer.from(await convert({ buffer: input, format: "JPEG", quality: 0.92 }));
    } catch {
      throw new UnsupportedImageError("cannot decode heif");
    }
  }
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new UnsupportedImageError("not an image");
  }
  const format = mapFormat(meta.format);
  if (!format) throw new UnsupportedImageError(`format ${meta.format ?? "unknown"}`);
  if (meta.pages && meta.pages > 1 && format !== "heif") throw new UnsupportedImageError("animated");

  const source = format === "heif" ? await decodeable(input) : input;
  const base = () => sharp(source, { limitInputPixels: MAX_PIXELS }).rotate();

  let display: { data: Buffer; info: OutputInfo };
  try {
    display = await base()
      .resize({ width: DISPLAY_MAX, height: DISPLAY_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new UnsupportedImageError("decode failed");
  }
  const thumb = await base()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  // Oriented original dimensions (EXIF orientations 5–8 swap width/height).
  const swap = (meta.orientation ?? 1) >= 5;
  const width = (swap ? meta.height : meta.width) ?? display.info.width;
  const height = (swap ? meta.width : meta.height) ?? display.info.height;

  return { format, width, height, display: display.data, thumb };
}

export function contentTypeFor(format: PhotoFormat): string {
  return format === "heif" ? "image/heif" : `image/${format}`;
}
