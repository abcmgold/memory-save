"use client";

import { Avatar, Label } from "@/components/ui/primitives";
import type { UserRef } from "@/lib/types";

const btn = "h-10 shrink-0 rounded-[10px] border-2 border-ink px-2.5 text-[13px] disabled:opacity-60";

export function IncomingRequests({
  users,
  busy,
  onAccept,
  onDecline,
}: {
  users: UserRef[];
  busy: string | null;
  onAccept: (u: UserRef) => void;
  onDecline: (u: UserRef) => void;
}) {
  if (users.length === 0) return null;
  return (
    <section aria-labelledby="in-h" className="flex flex-col gap-2.5">
      <Label id="in-h" tone="bg-pink">
        Lời mời đến · {users.length}
      </Label>
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-white p-3 shadow-brutal">
          <Avatar name={u.displayName} seed={u.id} size={44} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-extrabold">{u.displayName}</span>
            <span className="truncate text-[13px] font-medium text-muted">@{u.handle}</span>
          </span>
          <button type="button" disabled={busy === u.id} onClick={() => onDecline(u)} className={`${btn} bg-white font-bold`}>
            Từ chối
          </button>
          <button
            type="button"
            disabled={busy === u.id}
            onClick={() => onAccept(u)}
            className={`${btn} bg-mint font-extrabold shadow-brutal-sm`}
          >
            Đồng ý
          </button>
        </div>
      ))}
    </section>
  );
}

export function OutgoingRequests({
  users,
  busy,
  onCancel,
}: {
  users: UserRef[];
  busy: string | null;
  onCancel: (u: UserRef) => void;
}) {
  if (users.length === 0) return null;
  return (
    <section aria-labelledby="out-h" className="flex flex-col gap-2.5">
      <Label id="out-h">Đã gửi · {users.length}</Label>
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-ink bg-white p-3">
          <Avatar name={u.displayName} seed={u.id} size={44} className="bg-[#e8e1d3]" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-extrabold">{u.displayName}</span>
            <span className="truncate text-[13px] font-medium text-muted">@{u.handle} · Đang chờ đồng ý</span>
          </span>
          <button type="button" disabled={busy === u.id} onClick={() => onCancel(u)} className={`${btn} bg-white font-bold`}>
            Hủy
          </button>
        </div>
      ))}
    </section>
  );
}
