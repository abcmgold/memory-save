"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { UserRef } from "@/lib/types";
import { AddFriendForm } from "./AddFriendForm";
import { IncomingRequests, OutgoingRequests } from "./RequestList";
import { FriendList } from "./FriendList";

type Overview = { friends: UserRef[]; incoming: UserRef[]; outgoing: UserRef[] };

export function FriendsPanel({ initial }: { initial: Overview }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload(message?: string) {
    setData(await api<Overview>("/api/friends"));
    if (message) setNotice(message);
    router.refresh(); // updates the invitation badge in the nav
  }

  async function act(u: UserRef, path: string, method: string, message: string) {
    setBusy(u.id);
    setNotice(null);
    try {
      await api(path, { method });
      await reload(message);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AddFriendForm onDone={(m) => reload(m)} />
      {notice && (
        <p role="status" className="rounded-xl border-2 border-ink bg-butter px-3 py-2 text-sm font-semibold">
          {notice}
        </p>
      )}
      <IncomingRequests
        users={data.incoming}
        busy={busy}
        onAccept={(u) => act(u, `/api/friends/requests/${u.id}/accept`, "POST", `Bạn và ${u.displayName} đã là bạn bè.`)}
        onDecline={(u) => act(u, `/api/friends/requests/${u.id}/decline`, "POST", "Đã từ chối lời mời.")}
      />
      <OutgoingRequests
        users={data.outgoing}
        busy={busy}
        onCancel={(u) => act(u, `/api/friends/requests/${u.id}`, "DELETE", "Đã hủy lời mời.")}
      />
      <FriendList
        friends={data.friends}
        onUnfriend={(u) => act(u, `/api/friends/${u.id}`, "DELETE", `Đã hủy kết bạn với ${u.displayName}.`)}
      />
    </div>
  );
}
