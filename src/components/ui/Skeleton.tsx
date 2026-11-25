// Loading skeletons for loading.tsx files — instant feedback on navigation, same neo-brutalism look.
import { Sticker } from "./primitives";

/** A pulsing placeholder block. */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-xl bg-[#ebe4d6] ${className}`} />;
}

/** Announces loading to screen readers; children are decorative. */
function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function PageHeader({
  title,
  tone,
  subtitle = true,
  right,
  sticky = true,
}: {
  title: string;
  tone: "lavender" | "butter" | "mint" | "peach";
  subtitle?: boolean;
  right?: React.ReactNode;
  sticky?: boolean;
}) {
  return (
    <div
      className={`${sticky ? "sticky top-0 z-20" : ""} flex items-center justify-between gap-3 border-b-2 border-ink bg-cream px-4 pt-[max(20px,env(safe-area-inset-top))] pb-4`}
    >
      <div className="flex flex-col gap-2.5">
        <Sticker tone={tone} as="span">
          {title}
        </Sticker>
        {subtitle && <Bone className="h-3.5 w-36" />}
      </div>
      {right}
    </div>
  );
}

export function JournalSkeleton() {
  return (
    <Shell label="Đang tải nhật ký…">
      <div className="sticky top-0 z-20 flex flex-col gap-4 border-b-2 border-ink bg-cream px-4 pt-[max(20px,env(safe-area-inset-top))] pb-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2.5">
            <Sticker tone="lavender" as="span">
              Nhật ký
            </Sticker>
            <Bone className="h-3.5 w-28" />
          </div>
          <div className="flex gap-2.5">
            <Bone className="h-[46px] w-[46px] rounded-[14px]" />
            <Bone className="h-[46px] w-[46px] rounded-[14px]" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Bone key={i} className="h-[62px]" />
          ))}
        </div>
      </div>
      <div className="flex flex-col px-4 pt-1">
        <Bone className="mt-5 mb-3.5 h-6 w-40 rounded-lg" />
        <div className="ml-2.5 flex flex-col gap-4 border-l-2 border-[#ebe4d6] pl-5">
          {[true, false, true].map((photo, i) => (
            <div key={i} className="flex gap-3 rounded-[18px] border-2 border-[#ebe4d6] bg-white p-3">
              {photo && <Bone className="h-[72px] w-[72px] shrink-0" />}
              <div className="flex flex-1 flex-col gap-2 py-0.5">
                <Bone className="h-4 w-12 rounded-md" />
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function MomentsSkeleton() {
  return (
    <Shell label="Đang tải khoảnh khắc…">
      <PageHeader title="Khoảnh khắc" tone="butter" right={<Bone className="h-12 w-12 rounded-full" />} />
      <div className="flex flex-col gap-7 px-4">
        <Bone className="mt-5 h-6 w-28 rounded-lg" />
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <Bone className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Bone className="h-4 w-24" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
            <Bone className="aspect-[4/5] w-full rounded-[28px]" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function FriendsSkeleton() {
  return (
    <Shell label="Đang tải bạn bè…">
      <PageHeader title="Bạn bè" tone="mint" sticky={false} right={<Bone className="h-11 w-28" />} />
      <div className="flex flex-col gap-6 px-4 pt-[18px]">
        <Bone className="h-[190px] w-full rounded-2xl bg-[#f6e7a8]" />
        <Bone className="h-[104px] w-full rounded-2xl" />
        <div className="flex flex-col gap-2.5">
          <Bone className="h-6 w-24 rounded-lg" />
          <div className="overflow-hidden rounded-2xl border-2 border-[#ebe4d6] bg-white">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex min-h-16 items-center gap-3 border-b-2 border-[#ebe4d6] px-3 last:border-b-0">
                <Bone className="h-[42px] w-[42px] shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Bone className="h-4 w-1/2" />
                  <Bone className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function EntrySkeleton() {
  return (
    <Shell label="Đang tải bài viết…">
      <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2.5">
        <Bone className="h-11 w-11" />
        <Bone className="h-11 w-20" />
      </div>
      <div className="flex flex-col gap-3.5 px-4 pt-1.5">
        <Bone className="h-6 w-44 rounded-md" />
        <Bone className="h-8 w-3/4" />
        <Bone className="aspect-[4/5] w-full rounded-3xl" />
        <div className="flex flex-col gap-2 pt-1">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-11/12" />
          <Bone className="h-4 w-2/3" />
        </div>
      </div>
    </Shell>
  );
}

export function FormSkeleton({ title }: { title: string }) {
  return (
    <Shell label="Đang mở trình soạn…">
      <div className="flex items-center justify-between border-b-2 border-ink bg-cream px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3.5">
        <Bone className="h-11 w-16" />
        <span className="-rotate-2 border-[2.5px] border-ink bg-peach px-2.5 py-0.5 text-lg font-black uppercase shadow-brutal">
          {title}
        </span>
        <Bone className="h-11 w-16 bg-[#d3eedb]" />
      </div>
      <div className="flex flex-col gap-[18px] px-4 pt-[18px]">
        {[["w-16", "h-12"], ["w-24", "h-12"], ["w-20", "h-40"]].map(([label, field], i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bone className={`h-4 ${label}`} />
            <Bone className={`${field} w-full`} />
          </div>
        ))}
        <div className="grid grid-cols-4 gap-2.5">
          <Bone className="aspect-square" />
        </div>
      </div>
    </Shell>
  );
}

export function CameraSkeleton() {
  return (
    <Shell label="Đang mở camera…">
      <div className="flex h-[calc(100dvh-96px)] min-h-[520px] flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2">
        <Bone className="h-11 w-11 rounded-full" />
        <span className="-rotate-2 border-[2.5px] border-ink bg-lavender px-3.5 py-1 text-xl font-black tracking-tight shadow-brutal-lg">
          MemorySave
        </span>
        <Bone className="h-11 w-11 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1 px-4 pt-3">
        <div className="h-full w-full rounded-[32px] border-[3px] border-ink bg-[#2b2a27] shadow-brutal-lg" />
      </div>
      <div className="flex shrink-0 items-center justify-between px-10 pt-5 pb-12 [@media(max-height:700px)]:pb-3">
        <Bone className="h-[52px] w-[52px] rounded-2xl" />
        <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-ink bg-white shadow-brutal-lg">
          <span className="block h-[60px] w-[60px] rounded-full border-2 border-ink bg-peach" />
        </span>
        <Bone className="h-[52px] w-[52px] rounded-full" />
      </div>
      </div>
    </Shell>
  );
}
