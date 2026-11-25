import { describe, expect, it } from "vitest";
import {
  addMinutes,
  compareLocal,
  dbToLocal,
  isLocalDateTime,
  localToDb,
  nowLocal,
  todayLocal,
} from "@/server/domain/clock";

describe("clock (research.md R8)", () => {
  // 2026-11-24T17:30:00Z is 2026-11-25 00:30 in Vietnam (UTC+7)
  const instant = new Date("2026-11-24T17:30:00Z");

  it("computes 'now' in the app time zone even when the server runs in UTC", () => {
    expect(nowLocal("Asia/Ho_Chi_Minh", instant)).toBe("2026-11-25T00:30");
    expect(todayLocal("Asia/Ho_Chi_Minh", instant)).toBe("2026-11-25");
    expect(nowLocal("UTC", instant)).toBe("2026-11-24T17:30");
  });

  it("validates the local date-time format", () => {
    expect(isLocalDateTime("2026-11-24T21:10")).toBe(true);
    expect(isLocalDateTime("2026-02-30T10:00")).toBe(false);
    expect(isLocalDateTime("2026-11-24 21:10")).toBe(false);
    expect(isLocalDateTime("2026-11-24T24:00")).toBe(false);
  });

  it("adds minutes across day boundaries", () => {
    expect(addMinutes("2026-11-24T23:59", 1)).toBe("2026-11-25T00:00");
    expect(addMinutes("2026-03-01T00:00", -1)).toBe("2026-02-28T23:59");
  });

  it("compares lexicographically-equivalent values", () => {
    expect(compareLocal("2026-11-24T21:10", "2026-11-24T21:11")).toBeLessThan(0);
    expect(compareLocal("2026-11-25T00:00", "2026-11-24T23:59")).toBeGreaterThan(0);
  });

  it("converts between API and database representations", () => {
    expect(localToDb("2026-11-24T21:10")).toBe("2026-11-24 21:10:00");
    expect(dbToLocal("2026-11-24 21:10:00")).toBe("2026-11-24T21:10");
    expect(dbToLocal("2026-11-24T21:10:00")).toBe("2026-11-24T21:10");
  });
});
