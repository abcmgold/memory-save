import Link from "next/link";
import { Sticker } from "@/components/ui/primitives";
import { CameraIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/Button";
import { TimelineList } from "@/components/journal/TimelineList";
import { listShared } from "@/server/services/moments";
import { localNow, requirePageUser } from "@/server/services/page-data";

export const metadata = { title: "Khoảnh khắc · MemorySave" };

export default async function MomentsPage() {
  const user = await requirePageUser();
  const page = await listShared(user.id, {});
  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-ink bg-cream px-4 pt-[max(20px,env(safe-area-inset-top))] pb-4">
        <div className="flex flex-col gap-2.5">
          <Sticker tone="butter">Khoảnh khắc</Sticker>
          <p className="text-sm font-medium text-muted">Bạn bè chia sẻ với bạn</p>
        </div>
        <Link
          href="/"
          aria-label="Đăng nhanh"
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-peach shadow-brutal"
        >
          <CameraIcon size={22} />
        </Link>
      </header>
      <main className="flex-1 px-4 pb-6">
        <TimelineList
          initial={page}
          endpoint="/api/entries?scope=friends"
          today={localNow().slice(0, 10)}
          variant="moments"
          empty={
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <p className="text-base font-semibold text-body">
                Chưa có khoảnh khắc nào được chia sẻ với bạn. Kết bạn với người thân để xem khoảnh khắc của nhau nhé.
              </p>
              <Link href="/me" className={buttonClass("primary", "md")}>
                Thêm bạn bè
              </Link>
            </div>
          }
        />
      </main>
    </>
  );
}
