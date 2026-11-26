"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, CameraIcon, MomentsIcon, PenIcon, UserIcon } from "./icons";
import { HOME_PATH } from "@/lib/routes";

const items = [
  { href: "/journal", label: "Nhật ký", Icon: BookIcon, match: (p: string) => p.startsWith("/journal") && p !== "/journal/new" },
  { href: "/moments", label: "Khoảnh khắc", Icon: MomentsIcon, match: (p: string) => p.startsWith("/moments") },
  { href: HOME_PATH, label: "Chụp", Icon: CameraIcon, match: (p: string) => p.startsWith(HOME_PATH) },
  { href: "/journal/new", label: "Viết", Icon: PenIcon, match: (p: string) => p === "/journal/new" },
  { href: "/me", label: "Cá nhân", Icon: UserIcon, match: (p: string) => p.startsWith("/me") },
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
        const showBadge = href === "/me" && incomingCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-center ${active ? "border-2 border-ink bg-lavender font-extrabold shadow-brutal" : "border-2 border-transparent font-semibold"}`}
          >
            <Icon size={22} className="shrink-0" />
            {/* One line, centered; shrinks slightly on narrow phones so "Khoảnh khắc" never wraps */}
            <span className="max-w-full text-[clamp(9.5px,2.75vw,11px)] leading-none tracking-tight whitespace-nowrap">
              {label}
            </span>
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
