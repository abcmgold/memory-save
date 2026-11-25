import { describe, expect, it } from "vitest";
import { isValidUsername, normalizeUsername } from "@/server/domain/username";

describe("username (data-model.md › users.username)", () => {
  it("normalizes case and surrounding spaces", () => {
    expect(normalizeUsername("  An_Nguyen ")).toBe("an_nguyen");
    expect(normalizeUsername("@minh_tran")).toBe("minh_tran");
  });

  it.each(["abc", "an_nguyen", "user123", "a".repeat(30), "___"])("accepts %s", (u) => {
    expect(isValidUsername(u)).toBe(true);
  });

  it.each(["ab", "a".repeat(31), "an nguyen", "nguyễn", "An", "a-b", "a.b", ""])("rejects %s", (u) => {
    expect(isValidUsername(u)).toBe(false);
  });
});
