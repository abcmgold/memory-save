"use client";

import { useState } from "react";
import { Avatar, Label } from "@/components/ui/primitives";
import { MoreIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import type { UserRef } from "@/lib/types";

export function FriendList({ friends, onUnfriend }: { friends: UserRef[]; onUnfriend: (u: UserRef) => Promise<void> }) {
  const [target, setTarget] = useState<UserRef | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section aria-labelledby="fr-h" className="flex flex-col gap-2.5">
      <Label id="fr-h">Bạn bè · {friends.length}</Label>
      {friends.length === 0 ? (
        <p className="text-sm font-medium text-muted">
          Chưa có bạn bè. Gửi link kết bạn ở trên cho người thân nhé.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-brutal">
          {friends.map((u, i) => (
            <li
              key={u.id}
              className={`flex min-h-16 items-center gap-3 pr-1.5 pl-3 ${i < friends.length - 1 ? "border-b-2 border-ink" : ""}`}
            >
              <Avatar name={u.displayName} seed={u.id} size={42} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-extrabold">{u.displayName}</span>
                <span className="truncate text-[13px] font-medium text-muted">@{u.handle}</span>
              </span>
              <button
                type="button"
                onClick={() => setTarget(u)}
                aria-label={`Tùy chọn cho ${u.displayName} (hủy kết bạn)`}
                className="flex h-11 w-11 items-center justify-center rounded-full"
              >
                <MoreIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!target} onClose={() => setTarget(null)} title={`Hủy kết bạn với ${target?.displayName ?? ""}?`}>
        <p className="mb-1.5 text-sm leading-normal text-body">
          Hai bạn sẽ không còn xem được các bài đã chia sẻ cho nhau. Kết bạn lại sau cũng không khôi phục các bài cũ.
        </p>
        <Button
          variant="danger"
          size="lg"
          disabled={busy}
          onClick={async () => {
            if (!target) return;
            setBusy(true);
            await onUnfriend(target).finally(() => setBusy(false));
            setTarget(null);
          }}
        >
          {busy ? "Đang xử lý…" : "Hủy kết bạn"}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setTarget(null)} disabled={busy}>
          Giữ lại
        </Button>
      </Sheet>
    </section>
  );
}
