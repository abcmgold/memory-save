/* eslint-disable @next/next/no-img-element -- private photos go through access-checked redirects */
import Link from "next/link";
import { LockIcon, UserIcon, UsersIcon } from "@/components/ui/icons";
import { formatTime } from "@/lib/format-date";
import { audienceLabel } from "@/lib/audience-label";
import type { Entry } from "@/lib/types";

function snippet(text: string | null, max = 90): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() + "…" : flat;
}

/** Timeline item (design "Nhật ký của tôi"). */
export function EntryCard({ entry }: { entry: Entry }) {
  const cover = entry.photos[0];
  const heading = entry.title ?? (snippet(entry.body, 60) || (entry.kind === "quick" ? "Khoảnh khắc" : "Ảnh"));
  const mode = entry.audience?.mode ?? "private";
  const shared = mode !== "private" && (entry.audience?.users.length ?? 0) > 0;
  const AudIcon = !shared ? LockIcon : mode === "friends" ? UsersIcon : UserIcon;

  return (
    <Link
      href={`/journal/${entry.id}`}
      className="relative flex gap-3 rounded-[18px] border-2 border-ink bg-white p-3 shadow-brutal transition-transform active:translate-x-px active:translate-y-px active:shadow-none"
    >
      <span
        aria-hidden="true"
        className={`absolute top-4 -left-[30px] h-4 w-4 rounded-full border-2 border-ink ${cover ? "bg-peach" : "bg-white"}`}
      />
      {cover && (
        <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 border-ink">
          <img src={cover.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          {entry.photos.length > 1 && (
            <span className="absolute right-1 bottom-1 rounded-md border-[1.5px] border-ink bg-white px-1.5 text-[11px] font-extrabold">
              {entry.photos.length}
            </span>
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="self-start rounded-md border-[1.5px] border-ink bg-butter px-1.5 text-xs font-extrabold">
          {formatTime(entry.eventAt)}
        </span>
        <span className="truncate text-[15px] font-extrabold">{heading}</span>
        {entry.title && entry.body && !cover && (
          <span className="text-sm leading-normal text-body">{snippet(entry.body)}</span>
        )}
        <span className="flex items-center gap-1 text-xs font-medium text-muted">
          <AudIcon size={14} strokeWidth={2.2} />
          {audienceLabel(entry.audience)}
          {entry.kind === "quick" ? " · Đăng nhanh" : ""}
        </span>
      </span>
    </Link>
  );
}
