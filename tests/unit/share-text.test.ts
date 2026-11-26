// 003-seo-sharing FR-S07 — research R5
import { describe, expect, it } from "vitest";
import {
  avatarToneIndex,
  cardNameFontSize,
  inviteShareDescription,
  inviteShareTitle,
  AVATAR_TONE_COUNT,
} from "@/lib/share-text";
import { avatarTone } from "@/components/ui/primitives";

describe("invite share texts", () => {
  it("names the inviter in the title", () => {
    expect(inviteShareTitle("Bùi Tuấn")).toBe("Bùi Tuấn mời bạn kết bạn trên MemorySave");
    expect(inviteShareTitle("  An  ")).toBe("An mời bạn kết bạn trên MemorySave");
  });

  it("describes what happens when you tap", () => {
    const d = inviteShareDescription("Bùi Tuấn");
    expect(d).toContain("Bùi Tuấn");
    expect(d.length).toBeLessThanOrEqual(160);
  });
});

describe("cardNameFontSize", () => {
  it("shrinks as the name gets longer and stays readable", () => {
    const sizes = [1, 10, 20, 30, 40, 50].map((n) => cardNameFontSize("a".repeat(n)));
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    expect(sizes[0]).toBeLessThanOrEqual(96);
    expect(sizes.at(-1)!).toBeGreaterThanOrEqual(48);
  });
});

describe("avatarToneIndex", () => {
  it("is the same colour the app's Avatar uses for this person", () => {
    const classes = ["bg-sky", "bg-pink", "bg-mint", "bg-butter", "bg-lavender", "bg-peach"];
    expect(AVATAR_TONE_COUNT).toBe(classes.length);
    for (const seed of ["a", "3f1c9a2e-0000-4000-8000-000000000001", "xyz"]) {
      expect(avatarTone(seed)).toBe(classes[avatarToneIndex(seed)]);
    }
  });
});
