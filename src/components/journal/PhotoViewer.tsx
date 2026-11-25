"use client";
/* eslint-disable @next/next/no-img-element -- private photos go through access-checked redirects */

import { useEffect, useRef, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import type { PhotoRef } from "@/lib/types";

/** Large photo + thumbnail strip; tap to view full screen (FR-016). */
export function PhotoViewer({ photos, alt }: { photos: PhotoRef[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = photos[index];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (full && !d.open) d.showModal();
    if (!full && d.open) d.close();
  }, [full]);

  if (!current) return null;
  const ratio = current.width && current.height ? `${current.width} / ${current.height}` : "4 / 5";

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setFull(true)}
        aria-label="Xem ảnh lớn"
        className="relative overflow-hidden rounded-3xl border-[2.5px] border-ink bg-white shadow-brutal-lg"
      >
        <img
          src={current.displayUrl}
          alt={`${alt} — ảnh ${index + 1}`}
          className="max-h-[70dvh] w-full bg-[#ebe4d6] object-cover"
          style={{ aspectRatio: ratio }}
        />
        {photos.length > 1 && (
          <span className="absolute top-3.5 right-3.5 rounded-lg border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-extrabold">
            {index + 1}/{photos.length}
          </span>
        )}
      </button>
      {photos.length > 1 && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ảnh ${i + 1}`}
              aria-current={i === index}
              className={`h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border-ink ${i === index ? "border-[2.5px] shadow-brutal" : "border-2 opacity-80"}`}
            >
              <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover bg-[#ebe4d6]" />
            </button>
          ))}
        </div>
      )}
      <dialog
        ref={dialog}
        onClose={() => setFull(false)}
        onClick={() => setFull(false)}
        aria-label="Ảnh lớn"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 backdrop:bg-ink"
      >
        <img src={current.displayUrl} alt={`${alt} — ảnh ${index + 1}`} className="h-full w-full object-contain" />
        <button
          type="button"
          aria-label="Đóng"
          onClick={() => setFull(false)}
          className="fixed top-[max(16px,env(safe-area-inset-top))] right-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-white"
        >
          <XIcon size={20} />
        </button>
      </dialog>
    </div>
  );
}
