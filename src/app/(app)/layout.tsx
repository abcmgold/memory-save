import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/http/auth";
import { BottomNav } from "@/components/ui/BottomNav";
import { countIncomingRequests } from "@/server/services/friends";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const incoming = await countIncomingRequests(user.id);
  return (
    <>
      <div className="flex flex-1 flex-col pb-[96px]">{children}</div>
      <BottomNav incomingCount={incoming} />
    </>
  );
}
