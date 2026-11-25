"use client";

import { useId, useState } from "react";
import { api, ApiError } from "@/lib/api-client";

/** Invite by exact public handle (FR-022, FR-037). */
export function AddFriendForm({ onDone }: { onDone: (message: string) => void }) {
  const id = useId();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ status: "pending" | "friends" }>("/api/friends/requests", { body: { handle } });
      onDone(r.status === "friends" ? "Hai bạn đã là bạn bè!" : "Đã gửi lời mời kết bạn.");
      setHandle("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không gửi được lời mời.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-white p-3.5 shadow-brutal">
      <label htmlFor={id} className="text-sm font-extrabold">
        Thêm bạn bằng mã định danh
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="vd: minh.tran.4821"
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={!!error || undefined}
          className="h-[46px] min-w-0 flex-1 rounded-xl border-2 border-ink bg-white px-3 text-base outline-none focus-visible:shadow-brutal"
        />
        <button
          type="submit"
          disabled={busy || !handle.trim()}
          className="h-[46px] shrink-0 rounded-xl border-2 border-ink bg-peach px-3.5 text-sm font-extrabold shadow-brutal disabled:opacity-60"
        >
          {busy ? "Đang gửi…" : "Gửi lời mời"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
