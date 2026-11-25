import { describe, expect, it } from "vitest";
import { defaultAudience, resolveAudience } from "@/server/domain/audience";
import { msg } from "@/lib/messages";

const F = ["f1", "f2", "f3"];

describe("audience (data-model.md › entry_audience, entries.audience_mode, users.last_audience)", () => {
  it("private → nobody", () => {
    expect(resolveAudience({ mode: "private" }, F)).toEqual({ ok: true, mode: "private", userIds: [] });
  });

  it("friends → a snapshot of current friends (FR-028)", () => {
    expect(resolveAudience({ mode: "friends" }, F)).toEqual({ ok: true, mode: "friends", userIds: F });
  });

  it("custom → the chosen friends, de-duplicated", () => {
    expect(resolveAudience({ mode: "custom", userIds: ["f2", "f2", "f1"] }, F)).toEqual({
      ok: true,
      mode: "custom",
      userIds: ["f2", "f1"],
    });
  });

  it("custom with someone who is not a friend is refused (FR-026)", () => {
    expect(resolveAudience({ mode: "custom", userIds: ["f1", "stranger"] }, F)).toEqual({
      ok: false,
      error: msg.audienceNotFriend,
    });
  });

  it("custom with nobody selected is private", () => {
    expect(resolveAudience({ mode: "custom", userIds: [] }, F)).toEqual({ ok: true, mode: "private", userIds: [] });
  });

  it("defaults: first time private; later the last choice, minus people no longer friends (FR-027)", () => {
    expect(defaultAudience(undefined, F)).toEqual({ mode: "private", userIds: [] });
    expect(defaultAudience({ mode: "friends", userIds: [] }, F)).toEqual({ mode: "friends", userIds: [] });
    expect(defaultAudience({ mode: "custom", userIds: ["f1", "gone"] }, F)).toEqual({ mode: "custom", userIds: ["f1"] });
    expect(defaultAudience({ mode: "custom", userIds: ["gone"] }, F)).toEqual({ mode: "private", userIds: [] });
  });
});
