import { renderAppIcon } from "@/server/og/app-icon";

// iOS "Add to Home Screen" icon (003 FR-S11)
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
