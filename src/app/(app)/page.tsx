import Link from "next/link";
import { QuickPost } from "@/components/camera/QuickPost";
import { Avatar } from "@/components/ui/primitives";
import { UsersIcon } from "@/components/ui/icons";
import { composeContext, requirePageUser } from "@/server/services/page-data";
import { countIncomingRequests } from "@/server/services/friends";
import { getAppTimeZone } from "@/server/env";
import { toUserRef } from "@/server/services/auth";

export const metadata = { title: "Chụp · MemorySave" };

export default async function CameraHome() {
  const user = await requirePageUser();
  const [{ friends, defaultAudience }, incoming] = await Promise.all([
    composeContext(user),
    countIncomingRequests(user.id),
  ]);
  const me = toUserRef(user);

  const header = (
    <header className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2">
      <Link href="/journal" aria-label="Nhật ký của tôi" className="rounded-full shadow-brutal">
        <Avatar name={me.displayName} seed={me.id} size={44} />
      </Link>
      <span className="-rotate-2 border-[2.5px] border-ink bg-lavender px-3.5 py-1 text-xl font-black tracking-tight shadow-brutal-lg">
        MemorySave
      </span>
      <Link
        href="/friends"
        aria-label={incoming ? `Bạn bè, ${incoming} lời mời mới` : "Bạn bè"}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-white shadow-brutal"
      >
        <UsersIcon size={22} />
        {incoming > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-pink px-1 text-[11px] font-extrabold">
            {incoming}
          </span>
        )}
      </Link>
    </header>
  );

  return (
    <QuickPost header={header} friends={friends} defaultAudience={defaultAudience} timeZone={getAppTimeZone()} />
  );
}
