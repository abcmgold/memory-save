"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, FlashIcon, ImageIcon, SwitchIcon } from "@/components/ui/icons";

type Facing = "environment" | "user";
type CamError = "denied" | "unavailable" | null;

// research.md R12 — in-app camera via getUserMedia, with a device picker fallback (FR-018, FR-019, FR-021)
export function CameraView({ onCapture }: { onCapture: (photo: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState<CamError>(null);
  const [ready, setReady] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => !cancelled && setError("unavailable"));
      return () => {
        cancelled = true;
      };
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps.torch);
        setTorchOn(false);
        setError(null);
        setReady(true);
      })
      .catch((err: DOMException) => {
        if (cancelled) return;
        setReady(false);
        setError(err?.name === "NotAllowedError" || err?.name === "SecurityError" ? "denied" : "unavailable");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") {
      // Save selfies the way they were previewed (mirrored), as people expect.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  function pickFile(files: FileList | null) {
    const f = files?.[0];
    if (f) onCapture(f);
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-5">
        <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[32px] border-[3px] border-ink bg-[#2b2a27] shadow-brutal-lg">
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Khung xem camera"
            className={`absolute inset-0 h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""} ${ready ? "" : "invisible"}`}
          />
          {!ready && (
            <div className="flex flex-col items-center gap-3 px-8 text-center text-sm text-[#d6d1c7]">
              <CameraIcon size={40} strokeWidth={1.5} />
              {error === "denied" && (
                <>
                  <p>Bạn chưa cho phép dùng camera. Có thể bật lại trong cài đặt trình duyệt, hoặc chụp bằng ứng dụng camera của máy.</p>
                  <FallbackButton onClick={() => fallbackRef.current?.click()} />
                </>
              )}
              {error === "unavailable" && (
                <>
                  <p>Không mở được camera trong trình duyệt này.</p>
                  <FallbackButton onClick={() => fallbackRef.current?.click()} />
                </>
              )}
              {!error && <p>Đang mở camera…</p>}
            </div>
          )}
          {ready && torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? "Tắt đèn flash" : "Bật đèn flash"}
              aria-pressed={torchOn}
              className={`absolute top-3.5 left-3.5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink ${torchOn ? "bg-butter" : "bg-white"}`}
            >
              <FlashIcon size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-10 pt-[26px]">
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          aria-label="Chọn ảnh từ thư viện"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-2 border-ink bg-mint shadow-brutal"
        >
          <ImageIcon size={24} />
        </button>
        <button
          type="button"
          onClick={ready ? capture : () => fallbackRef.current?.click()}
          disabled={busy}
          aria-label="Chụp ảnh"
          className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-ink bg-white shadow-brutal-lg transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span className="block h-[60px] w-[60px] rounded-full border-2 border-ink bg-peach" />
        </button>
        <button
          type="button"
          onClick={() => {
            setReady(false);
            setFacing((f) => (f === "environment" ? "user" : "environment"));
          }}
          disabled={!!error}
          aria-label="Đổi camera trước/sau"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-sky shadow-brutal disabled:opacity-40"
        >
          <SwitchIcon size={24} />
        </button>
      </div>
      <p className="mt-[18px] text-center text-[13px] font-medium text-muted">
        Chụp xong, thêm chú thích rồi chọn ai được xem
      </p>

      <input
        ref={fallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          pickFile(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        onChange={(e) => {
          pickFile(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function FallbackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 h-11 rounded-xl border-2 border-ink bg-butter px-4 text-sm font-extrabold text-ink shadow-brutal"
    >
      Chụp / chọn ảnh từ máy
    </button>
  );
}
