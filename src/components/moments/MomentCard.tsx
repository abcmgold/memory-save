/* eslint-disable @next/next/no-img-element -- private photos go through access-checked redirects */
import Link from "next/link";
import { Avatar } from "@/components/ui/primitives";
import { formatTime } from "@/lib/format-date";
import type { Entry } from "@/lib/types";

/** A friend's shared entry in "Khoảnh khắc" (design "Khoảnh khắc bạn bè"). */
export function MomentCard({ entry }: { entry: Entry }) {
  const cover = entry.photos[0];
  const isQuick = entry.kind === "quick" && cover;
  return (
    <article className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={entry.author.displayName} seed={entry.author.id} />
        <div className="flex flex-col">
          <span className="text-[15px] font-extrabold">{entry.author.displayName}</span>
          <span className="text-[13px] font-medium text-muted">
            {formatTime(entry.eventAt)} · {entry.kind === "quick" ? "Đăng nhanh" : "Nhật ký"}
          </span>
        </div>
      </div>
      {isQuick ? (
        <Link
          href={`/journal/${entry.id}`}
          className="relative block overflow-hidden rounded-[28px] border-[2.5px] border-ink bg-white shadow-brutal-lg"
        >
          <img
            src={cover.displayUrl}
            alt={entry.body ?? `Khoảnh khắc của ${entry.author.displayName}`}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover"
          />
          {entry.body && (
            <span className="absolute bottom-[18px] left-1/2 max-w-[85%] -translate-x-1/2 -rotate-[1.5deg] truncate rounded-xl border-2 border-ink bg-white px-4 py-2 text-[15px] font-bold shadow-brutal">
              {entry.body}
            </span>
          )}
        </Link>
      ) : (
        <Link
          href={`/journal/${entry.id}`}
          className="flex flex-col gap-2.5 rounded-[20px] border-[2.5px] border-ink bg-white p-4 shadow-brutal-lg"
        >
          {entry.title && <span className="text-[17px] font-extrabold">{entry.title}</span>}
          {entry.body && <span className="line-clamp-3 text-[15px] leading-relaxed text-body">{entry.body}</span>}
          {entry.photos.length > 0 && (
            <span className="grid grid-cols-3 gap-2">
              {entry.photos.slice(0, 3).map((p, i) => (
                <span key={p.id} className="relative block h-[92px] overflow-hidden rounded-xl border-2 border-ink">
                  <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {i === 2 && entry.photos.length > 3 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-lavender/80 text-base font-extrabold">
                      +{entry.photos.length - 3}
                    </span>
                  )}
                </span>
              ))}
            </span>
          )}
        </Link>
      )}
    </article>
  );
}
