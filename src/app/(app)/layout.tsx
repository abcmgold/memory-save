import { Suspense } from "react";
import type { Metadata } from "next";
import { BottomNav } from "@/components/ui/BottomNav";
import { getCurrentUser } from "@/server/http/auth";
import { incomingCount } from "@/server/services/page-data";

// Signed-in pages are never indexed (003 FR-S05); signed-out visitors never reach them (src/proxy.ts).
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Must not await cookies/DB at the top level: without Cache Components that would block every
 * navigation and hide loading.tsx (Next.js docs › layout › "Interaction with loading.js").
 * Auth is enforced by each page (requirePageUser) and by every API route.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-[96px]">{children}</div>
      <Suspense fallback={<BottomNav incomingCount={0} />}>
        <NavWithBadge />
      </Suspense>
    </>
  );
}

async function NavWithBadge() {
  const user = await getCurrentUser();
  return <BottomNav incomingCount={user ? await incomingCount(user.id) : 0} />;
}
