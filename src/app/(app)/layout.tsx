import { Suspense } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { getCurrentUser } from "@/server/http/auth";
import { incomingCount } from "@/server/services/page-data";

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
