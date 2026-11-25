"use client";

import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.replace("/login");
        router.refresh();
      }}
      className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-ink bg-white px-3 text-sm font-bold shadow-brutal"
    >
      <LogoutIcon size={18} /> Đăng xuất
    </button>
  );
}
