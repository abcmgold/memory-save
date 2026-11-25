import { describe, expect, it } from "vitest";
import { validateEntry } from "@/server/domain/entry-rules";
import { msg } from "@/lib/messages";

const NOW = "2026-11-25T10:00";

describe("entry rules (data-model.md › entries)", () => {
  it("defaults eventAt to now and trims text", () => {
    const r = validateEntry({ title: "  Hôm nay  ", body: " vui ", kind: "journal", photoCount: 0 }, NOW);
    expect(r).toEqual({ ok: true, value: { title: "Hôm nay", body: "vui", eventAt: NOW } });
  });

  it("turns blank title/body into null", () => {
    const r = validateEntry({ title: "   ", body: "x", kind: "journal", photoCount: 0 }, NOW);
    expect(r.ok && r.value.title).toBeNull();
  });

  it("rejects an entirely empty entry (FR-007)", () => {
    const r = validateEntry({ title: " ", body: "", kind: "journal", photoCount: 0 }, NOW);
    expect(r).toEqual({ ok: false, errors: { _: msg.entryEmpty } });
  });

  it("accepts a photo-only entry", () => {
    expect(validateEntry({ kind: "journal", photoCount: 1 }, NOW).ok).toBe(true);
  });

  it("enforces title ≤ 200 and body ≤ 20,000 characters", () => {
    const r = validateEntry({ title: "a".repeat(201), body: "b".repeat(20_001), kind: "journal", photoCount: 0 }, NOW);
    expect(r).toEqual({ ok: false, errors: { title: msg.titleTooLong, body: msg.bodyTooLong } });
    expect(validateEntry({ title: "a".repeat(200), body: "b".repeat(20_000), kind: "journal", photoCount: 0 }, NOW).ok).toBe(true);
  });

  it("accepts past times and up to 1 minute of clock skew, rejects the future (FR-006)", () => {
    expect(validateEntry({ body: "x", eventAt: "2025-01-01T08:00", kind: "journal", photoCount: 0 }, NOW).ok).toBe(true);
    expect(validateEntry({ body: "x", eventAt: "2026-11-25T10:01", kind: "journal", photoCount: 0 }, NOW).ok).toBe(true);
    expect(validateEntry({ body: "x", eventAt: "2026-11-25T10:02", kind: "journal", photoCount: 0 }, NOW)).toEqual({
      ok: false,
      errors: { eventAt: msg.eventInFuture },
    });
  });

  it("rejects malformed event times", () => {
    expect(validateEntry({ body: "x", eventAt: "25/11/2026 10:00", kind: "journal", photoCount: 0 }, NOW)).toEqual({
      ok: false,
      errors: { eventAt: msg.eventAtFormat },
    });
  });

  it("limits photos to 10 per entry", () => {
    expect(validateEntry({ kind: "journal", photoCount: 11 }, NOW)).toEqual({
      ok: false,
      errors: { photoIds: msg.tooManyPhotos },
    });
  });
});
