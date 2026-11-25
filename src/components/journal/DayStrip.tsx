"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, PlusIcon } from "@/components/ui/icons";
import { formatLongDate, shortDow, weekOf } from "@/lib/format-date";

/** Journal header: title, "jump to date" + "new entry" buttons, and the week strip (design "Nhật ký"; FR-012). */
export function JournalHeader({
  title,
  selected,
  today,
  marked,
}: {
  title: React.ReactNode;
  selected: string | null;
  today: string;
  marked: string[];
}) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const focus = selected ?? today;
  const days = weekOf(focus);
  const has = new Set(marked);
  const go = (d: string | null) => router.push(d ? `/journal?date=${d}` : "/journal");

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-4 border-b-2 border-ink bg-cream px-4 pt-[max(20px,env(safe-area-inset-top))] pb-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2.5">{title}</div>
        <div className="flex shrink-0 gap-2.5">
          <button
            type="button"
            aria-label="Nhảy tới ngày"
            onClick={() => {
              const el = picker.current;
              if (!el) return;
              if (typeof el.showPicker === "function") el.showPicker();
              else el.click();
            }}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border-2 border-ink bg-white shadow-brutal"
          >
            <CalendarIcon size={20} />
          </button>
          <Link
            href="/journal/new"
            aria-label="Viết bài mới"
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border-2 border-ink bg-peach shadow-brutal"
          >
            <PlusIcon size={20} />
          </Link>
          <input
            ref={picker}
            type="date"
            max={today}
            defaultValue={focus}
            aria-label="Chọn ngày"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => e.target.value && go(e.target.value)}
          />
        </div>
      </div>
      <div role="list" aria-label="Chọn ngày trong tuần" className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const future = d > today;
          const on = d === focus;
          return (
            <button
              key={d}
              role="listitem"
              type="button"
              disabled={future}
              onClick={() => go(d === today ? null : d)}
              aria-label={`${formatLongDate(d)}${has.has(d) ? ", có bài" : ""}`}
              aria-current={on ? "date" : undefined}
              className={`flex h-[62px] flex-col items-center justify-center gap-px rounded-xl ${
                on
                  ? "border-2 border-ink bg-butter shadow-brutal"
                  : future
                    ? "border-2 border-dashed border-[#b5ad9e] text-[#6e685d]"
                    : "border-2 border-ink bg-white"
              }`}
            >
              <span className="text-[11px] font-semibold">{shortDow(d)}</span>
              <span className="text-base font-extrabold">{Number(d.slice(8, 10))}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${has.has(d) ? "bg-ink" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
    </header>
  );
}
