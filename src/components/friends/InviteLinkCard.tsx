"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { api, ApiError } from "@/lib/api-client";

/** "Link kết bạn": copy / share / create a new one (FR-039). */
export function InviteLinkCard({ initialUrl, handle }: { initialUrl: string; handle: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`Đã sao chép ${what}.`);
    } catch {
      setNotice("Không sao chép được — hãy giữ để chọn và sao chép thủ công.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Kết bạn trên MemorySave", text: "Bấm link để kết bạn với mình trên MemorySave:", url });
    } catch {
      /* user cancelled */
    }
  }

  async function rotate() {
    setBusy(true);
    try {
      const r = await api<{ url: string }>("/api/friends/invite-link", { method: "POST" });
      setUrl(r.url);
      setNotice("Đã tạo link mới. Link cũ không còn dùng được.");
      setConfirm(false);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Không tạo được link mới.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="invite-h" className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-butter p-3.5 shadow-brutal">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 id="invite-h" className="text-[15px] font-extrabold">
            Link kết bạn
          </h2>
          <p className="text-[13px] font-medium text-body">Ai bấm link (và đăng nhập) sẽ thành bạn của bạn ngay.</p>
        </div>
      </div>
      <p className="rounded-xl border-2 border-ink bg-white px-3 py-2 font-mono text-[13px] break-all select-all">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => copy(url, "link")}>
          Sao chép link
        </Button>
        {canShare && (
          <Button size="sm" variant="secondary" onClick={share}>
            Chia sẻ…
          </Button>
        )}
        <Button size="sm" variant="ghost" className="underline underline-offset-2" onClick={() => setConfirm(true)}>
          Tạo link mới
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-ink pt-3">
        <p className="min-w-0 text-[13px] font-medium">
          Mã định danh: <strong className="font-extrabold break-all">@{handle}</strong>
        </p>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => copy(handle, "mã định danh")}>
          Sao chép mã
        </Button>
      </div>
      {notice && (
        <p role="status" className="text-sm font-semibold">
          {notice}
        </p>
      )}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Tạo link kết bạn mới?">
        <p className="mb-1.5 text-sm leading-normal text-body">
          Link cũ sẽ ngừng hoạt động ngay. Bạn bè hiện tại không bị ảnh hưởng. Dùng khi lỡ gửi link cho người không quen.
        </p>
        <Button variant="danger" size="lg" disabled={busy} onClick={rotate}>
          {busy ? "Đang tạo…" : "Tạo link mới"}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setConfirm(false)} disabled={busy}>
          Giữ link cũ
        </Button>
      </Sheet>
    </section>
  );
}
