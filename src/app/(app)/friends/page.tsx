import { Sticker } from "@/components/ui/primitives";
import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { InviteLinkCard } from "@/components/friends/InviteLinkCard";
import { LogoutButton } from "@/components/friends/LogoutButton";
import { requestOrigin, requirePageUser } from "@/server/services/page-data";
import { friendsOverview } from "@/server/services/friends";
import { getInviteToken, inviteUrl } from "@/server/services/invites";

export const metadata = { title: "Bạn bè · MemorySave" };

export default async function FriendsPage() {
  const user = await requirePageUser();
  const [overview, token, origin] = await Promise.all([
    friendsOverview(user.id),
    getInviteToken(user.id),
    requestOrigin(),
  ]);
  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b-2 border-ink bg-cream px-4 pt-[max(20px,env(safe-area-inset-top))] pb-3.5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Sticker tone="mint">Bạn bè</Sticker>
          <p className="truncate text-sm font-medium text-muted">
            Mã của bạn: <strong className="font-extrabold text-ink">@{user.handle}</strong>
          </p>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col gap-6 px-4 pt-[18px] pb-6">
        <InviteLinkCard initialUrl={inviteUrl(origin, token)} handle={user.handle} />
        <FriendsPanel initial={overview} />
        {user.username ? (
          <p className="text-center text-xs font-medium text-muted">
            Tên đăng nhập của bạn (<span className="font-bold">{user.username}</span>) chỉ dùng để đăng nhập — không ai
            khác thấy.
          </p>
        ) : (
          <p className="text-center text-xs font-medium break-words text-muted">
            Bạn đăng nhập bằng Google (<span className="font-bold">{user.googleEmail}</span>) — không ai khác thấy email
            này.
          </p>
        )}
      </main>
    </>
  );
}
