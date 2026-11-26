"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { LogoutIcon } from "@/components/ui/icons";

/** Sign-out with a confirmation sheet, so a stray tap on a phone doesn't log you out. */
export function LogoutButton() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border-2 border-ink bg-white px-3 text-sm font-bold shadow-brutal"
      >
        <LogoutIcon size={18} /> Đăng xuất
      </button>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Đăng xuất khỏi MemorySave?">
        <p className="text-[15px] font-medium text-body">Nhật ký và bạn bè vẫn được giữ nguyên. Đăng nhập lại bất cứ lúc nào.</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
            Ở lại
          </Button>
          <Button variant="danger" onClick={logout} disabled={busy}>
            {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
