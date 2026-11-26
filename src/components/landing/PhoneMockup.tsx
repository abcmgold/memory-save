import { BookIcon, CameraIcon, LockIcon, MomentsIcon, PenIcon, UserIcon, UsersIcon } from "@/components/ui/icons";

// 004 FR-L03: an illustration of the journal built from the app's own styles, filled with made-up sample entries —
// never real user data or photos. Decorative only (the page text says the same thing), hence aria-hidden.

function SamplePhoto({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div className={`relative h-24 overflow-hidden rounded-xl border-2 border-ink ${tone}`}>
      {children}
    </div>
  );
}

function SampleEntry({
  time,
  title,
  audience,
  photo,
}: {
  time: string;
  title: string;
  audience: { icon: "friends" | "private"; label: string };
  photo: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-white p-2.5 shadow-brutal">
      {photo}
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-extrabold">{title}</p>
        <span className="shrink-0 text-[11px] font-bold text-muted">{time}</span>
      </div>
      <span className="inline-flex w-fit items-center gap-1 rounded-lg border-2 border-ink bg-cream px-1.5 py-0.5 text-[10px] font-bold">
        {audience.icon === "friends" ? <UsersIcon size={12} /> : <LockIcon size={12} />}
        {audience.label}
      </span>
    </div>
  );
}

export function PhoneMockup() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[272px] rotate-1">
      <div className="flex flex-col overflow-hidden rounded-[34px] border-[3px] border-ink bg-cream shadow-brutal-lg">
        <div className="flex items-center justify-between border-b-2 border-ink px-3.5 pt-4 pb-2.5">
          <span className="-rotate-2 border-2 border-ink bg-lavender px-2 py-0.5 text-sm font-black shadow-brutal-sm">
            Nhật ký
          </span>
          <span className="text-[11px] font-bold text-muted">Hôm nay</span>
        </div>
        <div className="flex flex-col gap-3 px-3 py-3">
          <SampleEntry
            time="17:30"
            title="Đi biển cùng cả nhà"
            audience={{ icon: "friends", label: "Tất cả bạn bè" }}
            photo={
              <SamplePhoto tone="bg-sky">
                <span className="absolute top-3 right-5 h-8 w-8 rounded-full border-2 border-ink bg-butter" />
                <span className="absolute inset-x-0 bottom-0 h-8 border-t-2 border-ink bg-[#7cc4f5]" />
                <span className="absolute bottom-0 left-0 h-5 w-24 rounded-tr-[40px] border-t-2 border-r-2 border-ink bg-butter" />
              </SamplePhoto>
            }
          />
          <SampleEntry
            time="08:15"
            title="Bánh sinh nhật của bà"
            audience={{ icon: "private", label: "Chỉ mình tôi" }}
            photo={
              <SamplePhoto tone="bg-pink">
                <span className="absolute bottom-3 left-1/2 h-9 w-24 -translate-x-1/2 rounded-t-lg border-2 border-ink bg-white" />
                <span className="absolute bottom-12 left-1/2 h-5 w-1.5 -translate-x-1/2 border-2 border-ink bg-butter" />
                <span className="absolute bottom-[68px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-coral" />
              </SamplePhoto>
            }
          />
        </div>
        <div className="grid grid-cols-5 border-t-2 border-ink bg-white px-2 pt-2 pb-3">
          {[BookIcon, MomentsIcon, CameraIcon, PenIcon, UserIcon].map((Icon, i) => (
            <span
              key={i}
              className={`mx-auto flex h-8 w-9 items-center justify-center rounded-lg ${i === 0 ? "border-2 border-ink bg-lavender" : ""}`}
            >
              <Icon size={16} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
