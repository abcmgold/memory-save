import { Avatar, Sticker } from "@/components/ui/primitives";
import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { InviteLinkCard } from "@/components/friends/InviteLinkCard";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { EmailCard } from "@/components/profile/EmailCard";
import { toUserRef } from "@/server/services/auth";
import { requestOrigin, requirePageUser } from "@/server/services/page-data";
import { friendsOverview } from "@/server/services/friends";
import { getInviteToken, inviteUrl } from "@/server/services/invites";

export const metadata = { title: "Cá nhân · MemorySave" };

/** "Cá nhân" tab: who I am, my friends, sign out. */
export default async function ProfilePage() {
  const user = await requirePageUser();
  const me = toUserRef(user);
  const [overview, token, origin] = await Promise.all([
    friendsOverview(user.id),
    getInviteToken(user.id),
    requestOrigin(),
  ]);
  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b-2 border-ink bg-cream px-4 pt-[max(20px,env(safe-area-inset-top))] pb-3.5">
        <Sticker tone="mint">Cá nhân</Sticker>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col gap-6 px-4 pt-[18px] pb-6">
        <section
          aria-label="Tài khoản của bạn"
          className="flex min-w-0 items-center gap-3 rounded-2xl border-2 border-ink bg-white p-3.5 shadow-brutal"
        >
          <Avatar name={me.displayName} seed={me.id} size={56} />
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-lg font-black">{me.displayName}</p>
            <p className="truncate text-sm font-semibold text-muted">@{me.handle}</p>
          </div>
        </section>
        <EmailCard email={user.email} />
        <InviteLinkCard initialUrl={inviteUrl(origin, token)} handle={user.handle} />
        <FriendsPanel initial={overview} />
      </main>
    </>
  );
}
