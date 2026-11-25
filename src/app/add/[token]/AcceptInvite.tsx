"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/api-client";

/**
 * Runs in the visitor's own signed-in browser, so a messaging app's link preview (no session, no JS)
 * can never make a friendship by itself (FR-041).
 */
export function AcceptInvite({ token, name }: { token: string; name: string }) {
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  function accept() {
    setState("working");
    api(`/api/invites/${token}/accept`, { method: "POST" }).then(
      () => setState("done"),
      (err) => {
        setError(err instanceof ApiError ? err.message : "Không kết bạn được.");
        setState("error");
      },
    );
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on open
  }, []);

  if (state === "working") return <p className="mt-6 font-semibold text-muted">Đang kết bạn…</p>;
  if (state === "error")
    return (
      <div className="mt-6 flex flex-col items-center gap-3">
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
        <button type="button" onClick={accept} className={buttonClass("primary", "md")}>
          Thử lại
        </button>
      </div>
    );
  return (
    <div className="mt-6 flex w-full flex-col items-center gap-4">
      <p className="flex items-center gap-2 rounded-xl border-2 border-ink bg-mint px-4 py-2 font-extrabold shadow-brutal">
        <CheckIcon size={16} /> Bạn và {name} đã là bạn bè!
      </p>
      <Link href="/moments" className={buttonClass("primary", "lg", "w-full")}>
        Xem khoảnh khắc
      </Link>
      <Link href="/" className={buttonClass("secondary", "lg", "w-full")}>
        Chụp & chia sẻ ngay
      </Link>
    </div>
  );
}
