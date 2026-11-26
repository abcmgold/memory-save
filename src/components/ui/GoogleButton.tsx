import { buttonClass } from "./Button";
import { GoogleIcon } from "./icons";
import { msg } from "@/lib/messages";

/**
 * "Tiếp tục với Google" (002-google-login FR-G01). A plain <a>, not next/link: it must hit the Route Handler as a
 * full navigation (no prefetch, no client-side routing) so the browser follows the redirect to Google.
 */
export function GoogleButton({ next, className = "" }: { next?: string | null; className?: string }) {
  const href = `/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a href={href} className={buttonClass("secondary", "lg", `shadow-brutal ${className}`)}>
      <GoogleIcon size={22} />
      {msg.googleContinue}
    </a>
  );
}

/** "──── hoặc ────" divider between the password form and the Google button. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-muted" aria-hidden="true">
      <span className="h-0.5 flex-1 bg-ink/20" />
      hoặc
      <span className="h-0.5 flex-1 bg-ink/20" />
    </div>
  );
}
