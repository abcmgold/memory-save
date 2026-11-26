import Link from "next/link";
import { getCurrentUser } from "@/server/http/auth";
import { AppError } from "@/server/http/errors";
import type { Metadata } from "next";
import { inviterNameByToken, lookupInvite } from "@/server/services/invites";
import {
  INVITE_FALLBACK_DESCRIPTION,
  INVITE_FALLBACK_TITLE,
  inviteShareDescription,
  inviteShareTitle,
  OPEN_GRAPH_DEFAULTS,
} from "@/lib/share-text";
import { buttonClass } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/primitives";
import { UsersIcon } from "@/components/ui/icons";
import { msg } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { AcceptInvite } from "./AcceptInvite";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { getGoogleConfig } from "@/server/env";

const NOINDEX = { index: false, follow: false };

/** Share card for the link (003 FR-S07–S09): the inviter's display name only; unknown token → generic card. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const inviter = await inviterNameByToken(token);
  const title = inviter ? inviteShareTitle(inviter.displayName) : INVITE_FALLBACK_TITLE;
  const description = inviter ? inviteShareDescription(inviter.displayName) : INVITE_FALLBACK_DESCRIPTION;
  return {
    title,
    description,
    robots: NOINDEX,
    openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: `/add/${encodeURIComponent(token)}` },
    twitter: { title, description },
  };
}

/** Landing page for a friend-invite link (FR-040, FR-041). Viewing never changes anything by itself. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getCurrentUser();
  let invite: Awaited<ReturnType<typeof lookupInvite>> | null = null;
  try {
    invite = await lookupInvite(token, viewer?.id ?? null);
  } catch (err) {
    if (!(err instanceof AppError && err.status === 404)) throw err;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pt-24 pb-10 text-center">
      <span className="-rotate-2 border-[2.5px] border-ink bg-lavender px-3.5 py-1 text-xl font-black tracking-tight shadow-brutal-lg">
        MemorySave
      </span>

      {!invite ? (
        <div className="mt-12 flex flex-col items-center gap-5">
          <p className="text-lg font-bold">{msg.inviteInvalid}</p>
          <Link href={viewer ? HOME_PATH : "/login"} className={buttonClass("primary", "md")}>
            {viewer ? "Về trang chính" : "Đăng nhập"}
          </Link>
        </div>
      ) : (
        <div className="mt-12 flex w-full flex-col items-center gap-4">
          <Avatar name={invite.inviter.displayName} seed={invite.inviter.id} size={88} className="shadow-brutal-lg" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-muted">Lời mời kết bạn từ</p>
            <h1 className="text-2xl font-black">{invite.inviter.displayName}</h1>
            <p className="text-sm font-semibold text-muted">@{invite.inviter.handle}</p>
          </div>

          {invite.status === "login_required" && (
            <div className="mt-4 flex w-full flex-col gap-3">
              <Link href={`/login?mode=register&next=/add/${token}`} className={buttonClass("primary", "lg")}>
                Tạo tài khoản để kết bạn
              </Link>
              <Link href={`/login?next=/add/${token}`} className={buttonClass("secondary", "lg")}>
                Tôi đã có tài khoản
              </Link>
              {getGoogleConfig() && <GoogleButton next={`/add/${token}`} />}
            </div>
          )}
          {invite.status === "self" && (
            <div className="mt-4 flex flex-col items-center gap-4">
              <p className="font-semibold">{msg.inviteSelf} Gửi link này cho người thân để kết bạn.</p>
              <Link href="/me" className={buttonClass("primary", "md")}>
                Xem bạn bè của tôi
              </Link>
            </div>
          )}
          {invite.status === "friends" && (
            <div className="mt-4 flex flex-col items-center gap-4">
              <p className="flex items-center gap-2 font-semibold">
                <UsersIcon size={18} /> Hai bạn đã là bạn bè.
              </p>
              <Link href="/moments" className={buttonClass("primary", "md")}>
                Xem khoảnh khắc
              </Link>
            </div>
          )}
          {invite.status === "available" && <AcceptInvite token={token} name={invite.inviter.displayName} />}
        </div>
      )}
    </main>
  );
}
