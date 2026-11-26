import "server-only";
import { ImageResponse } from "next/og";

// 003 research R6 — app icon: the BookIcon from the UI on the peach brand colour. Full-bleed square (no rounded corners
// or outer border): iOS and Android apply their own mask.
export function renderAppIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#FFB38A",
        }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth={2.4}>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="#FFFFFF" strokeLinejoin="round" />
          <path d="M5 17a3 3 0 0 1 3-3h11" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
