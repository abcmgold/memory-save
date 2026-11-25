"use client";
/* eslint-disable @next/next/no-img-element -- private photos are served through access-checked redirects, not next/image */

import { useEffect, useRef, useState } from "react";
import { CameraIcon, ImageIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { createLimiter, precheck, uploadPhoto } from "@/lib/upload";
import { MAX_PHOTOS_PER_ENTRY, msg } from "@/lib/messages";
import { ApiError } from "@/lib/api-client";
import type { PhotoRef } from "@/lib/types";

export type GridItem = {
  key: string;
  photoId?: string;
  src: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  file?: File;
};

export function itemsFromPhotos(photos: PhotoRef[]): GridItem[] {
  return photos.map((p) => ({ key: p.id, photoId: p.id, src: p.thumbUrl, progress: 100, status: "done" }));
}

const limiter = createLimiter(3);

/** Photo picker + upload grid (design "Viết nhật ký"). Reports ready photo ids and whether uploads are running. */
export function PhotoGrid({
  initial = [],
  onChange,
}: {
  initial?: GridItem[];
  onChange: (state: { photoIds: string[]; busy: boolean }) => void;
}) {
  const [items, setItems] = useState<GridItem[]>(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange({
      photoIds: items.filter((i) => i.status === "done" && i.photoId).map((i) => i.photoId!),
      busy: items.some((i) => i.status === "uploading"),
    });
  }, [items, onChange]);

  const patch = (key: string, p: Partial<GridItem>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function start(item: GridItem) {
    limiter(() =>
      uploadPhoto(item.file!, (progress) => patch(item.key, { progress })).then(
        (photo) => patch(item.key, { status: "done", photoId: photo.id, progress: 100 }),
        (err) => patch(item.key, { status: "error", error: err instanceof ApiError ? err.message : msg.network }),
      ),
    );
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setNotice(null);
    const room = MAX_PHOTOS_PER_ENTRY - items.length;
    const chosen = Array.from(files);
    if (chosen.length > room) setNotice(msg.tooManyPhotos);
    const fresh: GridItem[] = [];
    for (const file of chosen.slice(0, Math.max(room, 0))) {
      const problem = precheck(file);
      if (problem) {
        setNotice(`${file.name}: ${problem}`);
        continue;
      }
      fresh.push({ key: crypto.randomUUID(), src: URL.createObjectURL(file), progress: 0, status: "uploading", file });
    }
    setItems((list) => [...list, ...fresh]);
    fresh.forEach(start);
  }

  function remove(item: GridItem) {
    setItems((list) => list.filter((i) => i.key !== item.key));
    if (item.file) URL.revokeObjectURL(item.src);
    // A photo uploaded in this session but not yet attached is cleaned up right away.
    if (item.file && item.photoId) fetch(`/api/photos/${item.photoId}`, { method: "DELETE" }).catch(() => {});
  }

  function retry(item: GridItem) {
    patch(item.key, { status: "uploading", progress: 0, error: undefined });
    start({ ...item, status: "uploading" });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-extrabold">
          Ảnh ({items.length}/{MAX_PHOTOS_PER_ENTRY})
        </span>
        <span className="text-xs font-medium text-muted">JPEG, PNG, WebP, HEIC · ≤10 MB</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {items.map((item) => (
          <div key={item.key} className="relative aspect-square rounded-xl border-2 border-ink bg-white shadow-brutal-sm">
            <img src={item.src} alt="" className="h-full w-full rounded-[10px] object-cover" />
            {item.status === "uploading" && (
              <div className="absolute inset-x-1.5 bottom-1.5 h-2 overflow-hidden rounded-full border border-ink bg-white">
                <div className="h-full bg-peach transition-[width]" style={{ width: `${item.progress}%` }} />
                <span className="sr-only">Đang tải {item.progress}%</span>
              </div>
            )}
            {item.status === "error" && (
              <button
                type="button"
                onClick={() => retry(item)}
                className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-coral/80 px-1 text-center text-[11px] font-bold"
                title={item.error}
              >
                Lỗi · Thử lại
              </button>
            )}
            <button
              type="button"
              aria-label="Gỡ ảnh"
              onClick={() => remove(item)}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-white"
            >
              <XIcon size={10} strokeWidth={4} />
            </button>
          </div>
        ))}
        {items.length < MAX_PHOTOS_PER_ENTRY && (
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            aria-label="Thêm ảnh"
            className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-ink bg-white text-[11px] font-bold"
          >
            <PlusIcon size={22} />
            Thêm
          </button>
        )}
      </div>
      {notice && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {notice}
        </p>
      )}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-sky text-sm font-bold shadow-brutal"
        >
          <CameraIcon size={18} /> Chụp ảnh
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-mint text-sm font-bold shadow-brutal"
        >
          <ImageIcon size={18} /> Thư viện
        </button>
      </div>
      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
