"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, FlashIcon, ImageIcon, SwitchIcon } from "@/components/ui/icons";
import { detectInAppBrowser, externalBrowserUrl, IN_APP_LABEL, type InAppBrowser } from "@/lib/in-app-browser";

type Facing = "environment" | "user";
// "inapp": a chat/social app's built-in browser (Zalo…) — its web view forces the live preview into a full-screen
// player, so the phone's own camera app is used instead.
type CamError = "denied" | "unavailable" | "inapp" | null;

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
  const [inApp, setInApp] = useState<InAppBrowser | null>(null);

  useEffect(() => {
    let cancelled = false;
    const app = detectInAppBrowser(navigator.userAgent);
    if (app) {
      queueMicrotask(() => {
        if (cancelled) return;
        setInApp(app);
        setError("inapp");
      });
      return () => {
        cancelled = true;
      };
    }
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

  // Safety net for web views we don't recognise: if the preview is pulled into a full-screen player, stop the camera
  // and fall back to the phone's camera app instead of leaving the user stuck in a "live stream" screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const bail = () => {
      try {
        (video as HTMLVideoElement & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
      setError("inapp");
    };
    const onFullscreen = () => {
      if (document.fullscreenElement !== video) return;
      document.exitFullscreen?.().catch(() => {});
      bail();
    };
    video.addEventListener("webkitbeginfullscreen", bail);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      video.removeEventListener("webkitbeginfullscreen", bail);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Viewfinder fills whatever height is left, so the shutter never falls below the fold */}
      <div className="flex min-h-0 flex-1 px-4 pt-3">
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[32px] border-[3px] border-ink bg-[#2b2a27] shadow-brutal-lg">
          <video
            ref={videoRef}
            playsInline
            disablePictureInPicture
            controls={false}
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
              {error === "inapp" && <InAppNotice app={inApp} onCamera={() => fallbackRef.current?.click()} />}
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

      <div className="flex shrink-0 items-center justify-between px-10 pt-5">
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
      <p className="mt-3 mb-1 shrink-0 text-center text-[13px] font-medium text-muted [@media(max-height:700px)]:hidden">
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

function FallbackButton({ onClick, label = "Chụp / chọn ảnh từ máy" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 h-11 rounded-xl border-2 border-ink bg-butter px-4 text-sm font-extrabold text-ink shadow-brutal"
    >
      {label}
    </button>
  );
}

function InAppNotice({ app, onCamera }: { app: InAppBrowser | null; onCamera: () => void }) {
  const [copied, setCopied] = useState(false);
  const [outside] = useState(() =>
    typeof window === "undefined" ? null : externalBrowserUrl(window.location.href, navigator.userAgent),
  );
  const where = app ? `trình duyệt của ${IN_APP_LABEL[app]}` : "trình duyệt này";

  function openOutside() {
    if (outside) window.location.href = outside;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <p>Camera trong {where} không chụp được ngay trên trang. Hãy chụp bằng camera của máy, hoặc mở trang bằng trình duyệt.</p>
      <FallbackButton onClick={onCamera} label="Chụp bằng camera của máy" />
      {outside ? (
        <button type="button" onClick={openOutside} className="text-[13px] font-bold text-white underline underline-offset-2">
          Mở bằng trình duyệt
        </button>
      ) : (
        <>
          <p className="text-[12.5px]">Hoặc bấm ⋯ ở góc trên → “Mở bằng trình duyệt”.</p>
          <button type="button" onClick={copyLink} className="text-[13px] font-bold text-white underline underline-offset-2">
            {copied ? "Đã sao chép link" : "Sao chép link"}
          </button>
        </>
      )}
    </>
  );
}
