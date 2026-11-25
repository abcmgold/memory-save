import { describe, expect, it } from "vitest";
import { compareTimeline, dateUpperBound, decodeCursor, encodeCursor, groupByDay } from "@/server/domain/timeline";

const e = (id: string, eventAt: string, createdAt: string) => ({ id, eventAt, createdAt });

describe("timeline (research.md R9)", () => {
  it("orders by event time, then creation time, then id — newest first", () => {
    const items = [
      e("a", "2026-11-24T21:10", "2026-11-24 14:10:00.000001+00"),
      e("b", "2026-11-25T12:10", "2026-11-25 05:10:00+00"),
      e("c", "2026-11-25T12:10", "2026-11-25 06:00:00+00"),
      e("d", "2026-11-25T20:30", "2026-11-25 13:30:00+00"),
    ];
    expect([...items].sort(compareTimeline).map((x) => x.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("groups consecutive entries by day, keeping order", () => {
    const groups = groupByDay([
      e("d", "2026-11-25T20:30", "x"),
      e("c", "2026-11-25T12:10", "x"),
      e("a", "2026-11-24T21:10", "x"),
    ]);
    expect(groups.map((g) => [g.date, g.items.map((i) => i.id)])).toEqual([
      ["2026-11-25", ["d", "c"]],
      ["2026-11-24", ["a"]],
    ]);
  });

  it("round-trips cursors and rejects garbage", () => {
    const key = e("3f1c9a1e-8a5b-4c41-9a39-0d3d3f0f6c11", "2026-11-25T12:10", "2026-11-25 05:10:00.123456+00");
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor(Buffer.from('{"eventAt":"x"}').toString("base64url"))).toBeNull();
  });

  it("computes an exclusive upper bound for 'jump to date'", () => {
    expect(dateUpperBound("2026-11-24")).toBe("2026-11-25T00:00");
    expect(dateUpperBound("2026-12-31")).toBe("2027-01-01T00:00");
  });
});
