import type { Audience } from "./types";

export function audienceLabel(a: Audience | undefined): string {
  if (!a || a.mode === "private" || a.users.length === 0) return "Chỉ mình tôi";
  if (a.mode === "friends") return "Tất cả bạn bè";
  const names = a.users.map((u) => u.displayName);
  const shown = names.slice(0, 2).join(", ");
  return `${a.users.length} bạn: ${shown}${names.length > 2 ? "…" : ""}`;
}
