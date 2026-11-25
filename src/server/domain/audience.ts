// Pure — data-model.md › entry_audience, entries.audience_mode, users.last_audience (FR-026..FR-028)
import { msg } from "@/lib/messages";
import type { AudienceInput, AudienceMode } from "@/lib/types";

export type AudienceResolution =
  | { ok: true; mode: AudienceMode; userIds: string[] }
  | { ok: false; error: string };

/**
 * Turns the owner's choice into the concrete set of viewers.
 * "friends" is a snapshot of the owner's friends at save time — later friends are not included.
 */
export function resolveAudience(input: AudienceInput, currentFriendIds: string[]): AudienceResolution {
  if (input.mode === "private") return { ok: true, mode: "private", userIds: [] };
  if (input.mode === "friends") return { ok: true, mode: "friends", userIds: [...currentFriendIds] };
  const chosen = [...new Set(input.userIds ?? [])];
  const friends = new Set(currentFriendIds);
  if (chosen.some((id) => !friends.has(id))) return { ok: false, error: msg.audienceNotFriend };
  if (chosen.length === 0) return { ok: true, mode: "private", userIds: [] };
  return { ok: true, mode: "custom", userIds: chosen };
}

/** First time: private. Later: the last choice, dropping people who are no longer friends (FR-027). */
export function defaultAudience(last: AudienceInput | undefined, currentFriendIds: string[]): AudienceInput {
  if (!last || last.mode === "private") return { mode: "private", userIds: [] };
  if (last.mode === "friends") return { mode: "friends", userIds: [] };
  const friends = new Set(currentFriendIds);
  const still = (last.userIds ?? []).filter((id) => friends.has(id));
  return still.length ? { mode: "custom", userIds: still } : { mode: "private", userIds: [] };
}
