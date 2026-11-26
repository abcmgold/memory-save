import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/server/http/auth";
import { getPendingSignup, SIGNUP_COOKIE } from "@/server/services/google-login";
import { BookIcon, GoogleIcon, LockIcon } from "@/components/ui/icons";
import { GoogleSignupForm } from "./GoogleSignupForm";
import { HOME_PATH } from "@/lib/routes";

export const metadata = { title: "Chọn tên hiển thị · MemorySave", robots: { index: false } };

/** 002 contracts/api.md › Trang /login/google — a new Google user confirms their display name (FR-G03). */
export default async function GoogleSignupPage() {
  const store = await cookies();
  const pending = await getPendingSignup(store.get(SIGNUP_COOKIE)?.value);
  if (await getCurrentUser()) redirect(pending?.next ?? HOME_PATH);
  if (!pending) redirect("/login?error=google_expired");

  return (
    <main className="flex min-h-dvh flex-col px-5 pt-20 pb-9">
      <div className="flex items-center gap-3.5">
        <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] border-[2.5px] border-ink bg-peach shadow-brutal-lg">
          <BookIcon size={30} />
        </span>
        <h1 className="inline-block -rotate-2 border-[2.5px] border-ink bg-lavender px-4 py-1 text-[30px] font-black tracking-tight shadow-brutal-lg">
          MemorySave
        </h1>
      </div>
      <p className="mt-6 text-base leading-relaxed font-medium text-body">
        Chỉ còn một bước nữa thôi! Bạn muốn bạn bè thấy tên gì?
      </p>

      <div className="mt-7 flex flex-col gap-4 rounded-[20px] border-[2.5px] border-ink bg-white p-[18px] shadow-brutal-lg">
        <p className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2.5 text-sm font-semibold">
          <GoogleIcon size={18} className="shrink-0" />
          <span className="truncate">{pending.email}</span>
        </p>
        <GoogleSignupForm suggestedName={pending.suggestedName} next={pending.next} />
      </div>

      <p className="mt-5 text-center text-sm font-medium text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-extrabold text-ink underline underline-offset-2">
          Đăng nhập bằng tên đăng nhập và mật khẩu
        </Link>
      </p>

      <p className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-center text-[13px] font-medium text-muted">
        <LockIcon size={16} />
        Email Google chỉ mình bạn thấy
      </p>
    </main>
  );
}
