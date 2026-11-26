import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { avatarToneIndex, cardNameFontSize, SITE_NAME } from "@/lib/share-text";

// 003 research R5 — share images in the app's neo-brutalism style. ImageResponse (Satori) only does flexbox and only
// reads ttf/otf/woff, so Be Vietnam Pro is loaded from the woff files in assets/fonts. Fontsource ships it split into
// latin / latin-ext / vietnamese subsets, and Satori uses ONE file per family+weight — so each subset gets its own
// family name and FONT_STACK lists them as fallbacks (without this, "ấ", "ờ", "ạ"… are dropped).

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#111111";
const CREAM = "#FBF6EC";
const BODY = "#3D3A34";
// Same order as AVATAR_TONES in src/components/ui/primitives.tsx (sky, pink, mint, butter, lavender, peach)
const TONES = ["#A8D8FF", "#FFB3D1", "#B8F2C8", "#FFE27A", "#C8B6FF", "#FFB38A"];

type Font = { name: string; data: Buffer; weight: 600 | 900; style: "normal" };
const SUBSETS = ["latin", "vietnamese", "latin-ext"] as const;
const FONT_STACK = SUBSETS.map((s) => `BVP-${s}`).join(", ");
let fontsPromise: Promise<Font[]> | null = null;

function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all(
    ([900, 600] as const).flatMap((weight) =>
      SUBSETS.map(async (subset) => ({
        name: `BVP-${subset}`,
        weight,
        style: "normal" as const,
        data: await readFile(join(process.cwd(), "assets/fonts", `be-vietnam-pro-${subset}-${weight}-normal.woff`)),
      })),
    ),
  );
  return fontsPromise;
}

function BookMark({ size }: { size: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.3,
        border: `5px solid ${INK}`,
        background: TONES[5],
        boxShadow: `5px 5px 0 ${INK}`,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2.2}>
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" strokeLinejoin="round" />
        <path d="M5 17a3 3 0 0 1 3-3h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <BookMark size={84} />
      <div
        style={{
          display: "flex",
          padding: "6px 26px",
          border: `5px solid ${INK}`,
          background: TONES[4],
          boxShadow: `6px 6px 0 ${INK}`,
          transform: "rotate(-2deg)",
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        {SITE_NAME}
      </div>
    </div>
  );
}

function Invite({ name, seed }: { name: string; seed: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 176,
          height: 176,
          borderRadius: 999,
          border: `6px solid ${INK}`,
          background: TONES[avatarToneIndex(seed)],
          boxShadow: `6px 6px 0 ${INK}`,
          fontSize: 84,
          fontWeight: 900,
        }}
      >
        {initial}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "block",
            fontSize: cardNameFontSize(name),
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            lineClamp: 2,
          }}
        >
          {name.trim()}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: BODY }}>mời bạn kết bạn trên {SITE_NAME}</div>
      </div>
    </div>
  );
}

function Tagline() {
  return (
    <div style={{ display: "flex", flexDirection: "column", fontSize: 64, fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5 }}>
      <span>Ghi lại từng ngày,</span>
      <span>chia sẻ khoảnh khắc</span>
      <span>với người thân.</span>
    </div>
  );
}

/** 1200×630 share card. With an inviter: their avatar + name; without: the generic MemorySave card. */
export async function renderShareCard(inviter?: { name: string; seed: string } | null): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 48,
          background: CREAM,
          backgroundImage: "radial-gradient(#D8CDB8 2px, transparent 2.5px)",
          backgroundSize: "28px 28px",
          fontFamily: FONT_STACK,
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "44px 56px",
            background: "#FFFFFF",
            border: `6px solid ${INK}`,
            borderRadius: 40,
            boxShadow: `12px 12px 0 ${INK}`,
          }}
        >
          <Brand />
          {inviter ? <Invite name={inviter.name} seed={inviter.seed} /> : <Tagline />}
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: BODY }}>
            Riêng tư cho đến khi bạn chọn chia sẻ
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
