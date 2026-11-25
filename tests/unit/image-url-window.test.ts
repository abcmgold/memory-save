import { describe, expect, it } from "vitest";
import { IMAGE_CACHE_SEC, imageUrlWindow } from "@/server/services/photos";

describe("image URL window (research.md R5 rev: cacheable for 1 hour)", () => {
  it("signs with the start of the current hour so URLs are identical within the hour", () => {
    const a = imageUrlWindow(Date.UTC(2026, 10, 25, 9, 0, 1));
    const b = imageUrlWindow(Date.UTC(2026, 10, 25, 9, 59, 59));
    expect(a.signingDate.toISOString()).toBe("2026-11-25T09:00:00.000Z");
    expect(b.signingDate.getTime()).toBe(a.signingDate.getTime());
    expect(imageUrlWindow(Date.UTC(2026, 10, 25, 10, 0, 0)).signingDate.toISOString()).toBe("2026-11-25T10:00:00.000Z");
  });

  it("keeps the link valid for the whole hour plus a short grace, never much longer", () => {
    const { expiresInSec } = imageUrlWindow();
    expect(IMAGE_CACHE_SEC).toBe(3600);
    expect(expiresInSec).toBeGreaterThanOrEqual(3600);
    expect(expiresInSec).toBeLessThanOrEqual(3600 + 600);
  });
});
