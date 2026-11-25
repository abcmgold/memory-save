"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, CameraIcon, MomentsIcon, PenIcon, UsersIcon } from "./icons";

const items = [
  { href: "/journal", label: "Nhật ký", Icon: BookIcon, match: (p: string) => p.startsWith("/journal") && p !== "/journal/new" },
  { href: "/moments", label: "Khoảnh khắc", Icon: MomentsIcon, match: (p: string) => p.startsWith("/moments") },
  { href: "/", label: "Chụp", Icon: CameraIcon, match: (p: string) => p === "/" },
  { href: "/journal/new", label: "Viết", Icon: PenIcon, match: (p: string) => p === "/journal/new" },
  { href: "/friends", label: "Bạn bè", Icon: UsersIcon, match: (p: string) => p.startsWith("/friends") },
];

export function BottomNav({ incomingCount = 0 }: { incomingCount?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto grid h-[88px] w-full max-w-[480px] grid-cols-5 gap-1 border-t-2 border-ink bg-white px-2 pt-2.5 pb-[max(22px,env(safe-area-inset-bottom))]"
    >
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        const showBadge = href === "/friends" && incomingCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${active ? "border-2 border-ink bg-lavender font-extrabold shadow-brutal" : "font-semibold"}`}
          >
            <Icon size={22} />
            {label}
            {showBadge && (
              <span className="absolute top-0 right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-pink px-1 text-[11px] font-extrabold">
                {incomingCount}
                <span className="sr-only"> lời mời kết bạn mới</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
