"use client";

import { useEffect, useState } from "react";
import { detectInAppBrowser, externalBrowserUrl, IN_APP_LABEL, type InAppBrowser } from "@/lib/in-app-browser";

const DISMISSED_KEY = "ms_inapp_dismissed";

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
}

/**
 * Opened from a link inside Zalo/Facebook/…: show a bar right away offering to reopen the page in the default
 * browser (button where the platform has a link for it, copy-link, the app-menu hint). Nothing happens on its own —
 * the user can stay in the app; "Ở lại" hides the bar for the rest of the session.
 */
export function InAppBrowserGate() {
  const [app, setApp] = useState<InAppBrowser | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const found = detectInAppBrowser(ua);
    if (!found || readFlag(DISMISSED_KEY)) return;
    const external = externalBrowserUrl(window.location.href, ua);
    queueMicrotask(() => {
      setApp(found);
      setLink(external);
    });
  }, []);

  if (!app) return null;

  function openOutside() {
    // Rebuilt from the current address: the user may have moved to another page since the bar appeared.
    const url = externalBrowserUrl(window.location.href, navigator.userAgent) ?? link;
    if (url) window.location.href = url;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function dismiss() {
    setFlag(DISMISSED_KEY);
    setApp(null);
  }

  return (
    <div
      role="dialog"
      aria-label="Mở bằng trình duyệt"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div className="rounded-2xl border-[2.5px] border-ink bg-butter p-4 shadow-brutal-lg">
        <p className="text-[15px] font-extrabold text-ink">Mở bằng trình duyệt để dùng đầy đủ</p>
        <p className="mt-1 text-[13.5px] leading-snug font-medium text-body">
          Bạn đang xem trong {IN_APP_LABEL[app]} — ở đây camera và đăng nhập có thể không hoạt động.
          {!link && " Bấm ⋯ ở góc trên rồi chọn “Mở bằng trình duyệt”."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {link && (
            <button
              type="button"
              onClick={openOutside}
              className="h-10 rounded-xl border-2 border-ink bg-white px-3.5 text-sm font-extrabold text-ink shadow-brutal"
            >
              Mở bằng trình duyệt
            </button>
          )}
          <button
            type="button"
            onClick={copyLink}
            className="h-10 rounded-xl border-2 border-ink bg-white px-3.5 text-sm font-bold text-ink shadow-brutal"
          >
            {copied ? "Đã sao chép link" : "Sao chép link"}
          </button>
          <button type="button" onClick={dismiss} className="ml-auto h-10 px-1 text-[13px] font-bold text-ink underline underline-offset-2">
            Ở lại {IN_APP_LABEL[app]}
          </button>
        </div>
        {link && <p className="mt-2 text-[12px] font-medium text-muted">Không mở được? Bấm ⋯ ở góc trên → “Mở bằng trình duyệt”.</p>}
      </div>
    </div>
  );
}
