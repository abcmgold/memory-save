import { describe, expect, it } from "vitest";
import { formatHandle, handleBase, isValidHandle, normalizeHandle } from "@/server/domain/handle";

describe("public handle (data-model.md › users.handle, FR-037)", () => {
  it.each([
    ["An Nguyễn", "an.nguyen"],
    ["Đỗ Thị Lan", "do.thi.lan"],
    ["  Minh   Trần  ", "minh.tran"],
    ["Hùng-Võ (Út)", "hung.vo.ut"],
    ["Nguyễn Hoàng Phương Thảo Vy", "nguyen.hoang.phuong"],
    ["", "ban"],
    [null, "ban"],
    ["😀✨", "ban"],
  ])("base of %j is %s", (name, base) => {
    expect(handleBase(name)).toBe(base);
  });

  it("never exceeds 20 characters and never ends with a dot", () => {
    const b = handleBase("Aaaaaaaaaa Bbbbbbbbbb Cccc");
    expect(b.length).toBeLessThanOrEqual(20);
    expect(b.endsWith(".")).toBe(false);
  });

  it("formats and validates", () => {
    expect(formatHandle("an.nguyen", "4821")).toBe("an.nguyen.4821");
    expect(isValidHandle("an.nguyen.4821")).toBe(true);
    expect(isValidHandle("ban.000123")).toBe(true);
    expect(isValidHandle("an_nguyen")).toBe(false); // a username is not a handle
    expect(isValidHandle("an.nguyen")).toBe(false);
    expect(isValidHandle("an.nguyen.12")).toBe(false);
    expect(isValidHandle("An.Nguyen.4821")).toBe(false);
  });

  it("normalizes user input", () => {
    expect(normalizeHandle("  @An.Nguyen.4821 ")).toBe("an.nguyen.4821");
  });
});
