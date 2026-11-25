import Link from "next/link";
import { Sticker } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { JournalHeader } from "@/components/journal/DayStrip";
import { TimelineList } from "@/components/journal/TimelineList";
import { listMine } from "@/server/services/entries";
import { localNow, requirePageUser } from "@/server/services/page-data";
import { isLocalDate } from "@/server/domain/clock";
import { formatLongDate } from "@/lib/format-date";

export const metadata = { title: "Nhật ký · MemorySave" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requirePageUser();
  const today = localNow().slice(0, 10);
  const raw = (await searchParams).date;
  const date = raw && isLocalDate(raw) && raw <= today ? raw : null;
  const page = await listMine(user.id, { date });
  const endpoint = `/api/entries?scope=mine${date ? `&date=${date}` : ""}`;

  return (
    // `group` + the header's data-pending (set while a date change loads) dims the list below.
    <div className="group flex flex-1 flex-col">
      <JournalHeader
        selected={date}
        today={today}
        marked={page.items.map((e) => e.eventAt.slice(0, 10))}
        title={
          <>
            <Sticker tone="lavender">Nhật ký</Sticker>
            <p className="text-sm font-medium text-muted">
              {date ? `Từ ${formatLongDate(date)} trở về trước` : "Mới nhất trước"}
            </p>
          </>
        }
      />
      <main className="flex-1 px-4 pt-1 pb-6 transition-opacity duration-150 group-has-data-pending:pointer-events-none group-has-data-pending:opacity-50">
        {date && (
          <Link href="/journal" className="mt-3 inline-block text-sm font-extrabold underline underline-offset-4">
            ← Về hôm nay
          </Link>
        )}
        <TimelineList
          key={endpoint}
          initial={page}
          endpoint={endpoint}
          today={today}
          variant="journal"
          empty={
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <p className="text-base font-semibold text-body">
                {date ? "Không có bài nào trước ngày này." : "Chưa có bài nhật ký nào. Bắt đầu ghi lại hôm nay nhé!"}
              </p>
              <Link href="/journal/new" className={buttonClass("primary", "md")}>
                Viết bài đầu tiên
              </Link>
            </div>
          }
        />
      </main>
    </div>
  );
}
