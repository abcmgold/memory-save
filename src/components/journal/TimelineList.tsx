"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/primitives";
import { api } from "@/lib/api-client";
import { formatDayHeading } from "@/lib/format-date";
import type { Entry, Page } from "@/lib/types";
import { EntryCard } from "./EntryCard";
import { MomentCard } from "@/components/moments/MomentCard";

function groupByDay(items: Entry[]) {
  const groups: { date: string; items: Entry[] }[] = [];
  for (const it of items) {
    const date = it.eventAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.date === date) last.items.push(it);
    else groups.push({ date, items: [it] });
  }
  return groups;
}

/** Day-grouped list with infinite scroll, shared by "Nhật ký" (journal) and "Khoảnh khắc" (moments). */
export function TimelineList({
  initial,
  endpoint,
  today,
  variant,
  empty,
}: {
  initial: Page<Entry>;
  endpoint: string; // e.g. "/api/entries?scope=mine&date=2026-11-24"
  today: string;
  variant: "journal" | "moments";
  empty: React.ReactNode;
}) {
  const rail = variant === "journal";
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        setLoading(true);
        setFailed(false);
        try {
          const sep = endpoint.includes("?") ? "&" : "?";
          const page = await api<Page<Entry>>(`${endpoint}${sep}cursor=${encodeURIComponent(cursor)}`);
          setItems((prev) => [...prev, ...page.items]);
          setCursor(page.nextCursor);
        } catch {
          setFailed(true);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, endpoint, loading]);

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="flex flex-col">
      {groupByDay(items).map((g) => (
        <section key={g.date} aria-label={formatDayHeading(g.date, today)} className="flex flex-col">
          <Label className="mt-5 mb-3.5">{formatDayHeading(g.date, today)}</Label>
          <div className={rail ? "ml-2.5 flex flex-col gap-4 border-l-2 border-ink pl-5" : "flex flex-col gap-7"}>
            {g.items.map((e) => (
              <div key={e.id}>{variant === "journal" ? <EntryCard entry={e} /> : <MomentCard entry={e} />}</div>
            ))}
          </div>
        </section>
      ))}
      <div ref={sentinel} className="h-8" />
      {loading && <p className="py-3 text-center text-sm font-medium text-muted">Đang tải thêm…</p>}
      {failed && <p className="py-3 text-center text-sm font-semibold text-danger">Không tải được. Cuộn lại để thử.</p>}
      {!cursor && items.length > 5 && <p className="py-3 text-center text-[13px] font-medium text-muted">Đã hết</p>}
    </div>
  );
}
