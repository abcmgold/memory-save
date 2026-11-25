"use client";
/* eslint-disable @next/next/no-img-element -- local object URL preview */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@/components/ui/icons";
import { FormError } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api-client";
import { uploadPhoto } from "@/lib/upload";
import { MAX_CAPTION, msg } from "@/lib/messages";
import { formatTime } from "@/lib/format-date";
import type { AudienceInput, Entry, PhotoRef, UserRef } from "@/lib/types";
import { AudiencePicker, audienceSummary } from "./AudiencePicker";

type Upload = { status: "uploading"; progress: number } | { status: "done"; photo: PhotoRef } | { status: "error"; message: string };

/** Step 2 of quick post: preview, caption, audience, post (design "Xem lại & chọn người xem"). */
export function ReviewStep({
  photo,
  takenAt,
  friends,
  defaultAudience,
  onRetake,
}: {
  photo: Blob;
  takenAt: string; // local "YYYY-MM-DDTHH:mm" when the shot was taken
  friends: UserRef[];
  defaultAudience: AudienceInput;
  onRetake: () => void;
}) {
  const router = useRouter();
  const preview = useMemo(() => URL.createObjectURL(photo), [photo]);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<AudienceInput>(defaultAudience);
  const [upload, setUpload] = useState<Upload>({ status: "uploading", progress: 0 });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef(0);

  // Start uploading right away so "Đăng" is instant (SC-001).
  function startUpload() {
    const id = ++attempt.current;
    uploadPhoto(photo, (progress) => id === attempt.current && setUpload({ status: "uploading", progress })).then(
      (p) => id === attempt.current && setUpload({ status: "done", photo: p }),
      (err) =>
        id === attempt.current &&
        setUpload({ status: "error", message: err instanceof ApiError ? err.message : msg.network }),
    );
  }
  useEffect(() => {
    startUpload();
    return () => URL.revokeObjectURL(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per captured photo
  }, [photo]);

  function discard() {
    attempt.current++;
    if (upload.status === "done") fetch(`/api/photos/${upload.photo.id}`, { method: "DELETE" }).catch(() => {});
    onRetake();
  }

  async function post() {
    if (upload.status !== "done") return;
    setPosting(true);
    setError(null);
    try {
      await api<{ entry: Entry }>("/api/entries", {
        body: { kind: "quick", body: caption || null, eventAt: takenAt, photoIds: [upload.photo.id], audience },
      });
      router.push("/journal");
      router.refresh();
    } catch (err) {
      setPosting(false);
      setError(err instanceof ApiError ? (err.fields ? Object.values(err.fields)[0] : err.message) : msg.network);
    }
  }

  const label =
    upload.status === "uploading"
      ? `Đang tải ảnh… ${upload.progress}%`
      : posting
        ? "Đang đăng…"
        : `Đăng · ${audienceSummary(audience, friends)}`;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={discard}
          aria-label="Hủy, không đăng"
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-white shadow-brutal"
        >
          <XIcon size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[17px] font-extrabold">Xem lại</span>
          <span className="text-xs font-medium text-muted">Hôm nay · {formatTime(takenAt)}</span>
        </div>
        <button
          type="button"
          onClick={discard}
          className="flex h-11 items-center rounded-full border-2 border-ink bg-white px-3.5 text-sm font-bold shadow-brutal"
        >
          Chụp lại
        </button>
      </header>

      <div className="px-4 pt-3.5">
        <div className="relative overflow-hidden rounded-[32px] border-[3px] border-ink bg-white shadow-brutal-lg">
          <img src={preview} alt="Ảnh vừa chụp" className="aspect-[4/5] w-full object-cover" />
          {upload.status === "uploading" && (
            <div className="absolute inset-x-5 top-4 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
              <div className="h-full bg-peach transition-[width]" style={{ width: `${upload.progress}%` }} />
            </div>
          )}
          <label htmlFor="caption" className="sr-only">
            Chú thích
          </label>
          <input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={MAX_CAPTION}
            placeholder="Thêm chú thích…"
            className="absolute bottom-[18px] left-1/2 h-11 w-[72%] -translate-x-1/2 -rotate-[1.5deg] rounded-xl border-2 border-ink bg-white px-4 text-center text-[15px] font-bold shadow-brutal outline-none"
          />
        </div>
      </div>

      <section aria-labelledby="aud-title" className="flex flex-col gap-3 px-4 pt-[22px]">
        <h2 id="aud-title" className="text-[15px] font-extrabold">
          Ai được xem?
        </h2>
        <AudiencePicker value={audience} onChange={setAudience} friends={friends} />
      </section>

      <div className="mt-auto flex flex-col gap-3 px-4 pt-6 pb-4">
        {upload.status === "error" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-coral/40 px-3 py-2 text-sm font-semibold">
            <span>{upload.message}</span>
            <button type="button" onClick={startUpload} className="font-extrabold underline">
              Thử lại
            </button>
          </div>
        )}
        <FormError message={error} />
        <button
          type="button"
          onClick={post}
          disabled={upload.status !== "done" || posting}
          className="flex h-14 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-peach text-base font-extrabold shadow-brutal-lg transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-70"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
