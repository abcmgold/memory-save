import Link from "next/link";
import { Avatar, Card } from "@/components/ui/primitives";
import { ChevronLeftIcon, PenIcon } from "@/components/ui/icons";
import { PhotoViewer } from "@/components/journal/PhotoViewer";
import { DeleteEntryButton } from "@/components/journal/DeleteEntryButton";
import { requirePageUser } from "@/server/services/page-data";
import { loadEntryOr404 } from "@/server/services/entry-page";
import { formatEventAt } from "@/lib/format-date";
import type { Entry } from "@/lib/types";

export const metadata = { title: "Nhật ký · MemorySave" };

function ShareBox({ entry }: { entry: Entry }) {
  const a = entry.audience!;
  const shared = a.mode !== "private" && a.users.length > 0;
  return (
    <Card as="section" aria-labelledby="share-h" className="mt-1 flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="share-h" className="text-[15px] font-extrabold">
          {shared ? `Đang chia sẻ với ${a.users.length} bạn` : "Chỉ mình tôi xem được"}
        </h2>
        <Link
          href={`/journal/${entry.id}/edit#audience`}
          className="flex min-h-11 items-center text-sm font-extrabold underline underline-offset-[3px]"
        >
          Đổi người xem
        </Link>
      </div>
      {shared && (
        <div className="flex flex-wrap gap-2">
          {a.users.map((u) => (
            <span
              key={u.id}
              className="flex h-[34px] items-center gap-1.5 rounded-full border-2 border-ink bg-cream pr-3 pl-1 text-[13px] font-bold"
            >
              <Avatar name={u.displayName} seed={u.id} size={24} className="border-[1.5px] text-xs" />
              {u.displayName}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs font-medium text-muted">Bạn bè chỉ xem được, không sửa hay chia sẻ tiếp.</p>
    </Card>
  );
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const entry = await loadEntryOr404(user.id, (await params).id);
  const title = entry.title ?? (entry.kind === "quick" ? "Khoảnh khắc" : "Nhật ký");
  const back = entry.isOwner ? "/journal" : "/moments";
  const sharedNames = entry.audience?.users.map((u) => u.displayName).join(", ");

  return (
    <>
      <header className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2.5">
        <Link
          href={back}
          aria-label="Quay lại"
          className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink bg-white shadow-brutal"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        {entry.isOwner && (
          <Link
            href={`/journal/${entry.id}/edit`}
            className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-ink bg-butter px-4 text-sm font-extrabold shadow-brutal"
          >
            <PenIcon size={16} /> Sửa
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-3.5 px-4 pt-1.5 pb-8">
        {!entry.isOwner && (
          <div className="flex items-center gap-2.5">
            <Avatar name={entry.author.displayName} seed={entry.author.id} />
            <span className="text-[15px] font-extrabold">{entry.author.displayName}</span>
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <span className="self-start rounded-md border-2 border-ink bg-butter px-2 py-0.5 text-xs font-extrabold">
            {formatEventAt(entry.eventAt)}
          </span>
          {entry.title && <h1 className="text-[26px] leading-tight font-black tracking-tight">{entry.title}</h1>}
        </div>

        {entry.photos.length > 0 && <PhotoViewer photos={entry.photos} alt={title} />}

        {entry.body && <p className="mt-1 text-base leading-[1.65] whitespace-pre-wrap text-[#26241f]">{entry.body}</p>}

        {entry.isOwner && (
          <>
            <ShareBox entry={entry} />
            <DeleteEntryButton
              entryId={entry.id}
              title={title}
              detail={`Bài${entry.photos.length ? ` và ${entry.photos.length} ảnh` : ""} sẽ bị xóa vĩnh viễn.${sharedNames ? ` ${sharedNames} cũng sẽ không còn xem được.` : ""}`}
            />
          </>
        )}
      </main>
    </>
  );
}
