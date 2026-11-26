import type { Metadata } from "next";
import Link from "next/link";
import { BookIcon, LockIcon } from "@/components/ui/icons";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// 005 US3 — public, not worth indexing (contracts/api.md › Trang)
export const metadata: Metadata = {
  title: "Quên mật khẩu · MemorySave",
  description: "Lấy lại mật khẩu MemorySave bằng mã gửi tới email đã xác thực.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col px-5 pt-20 pb-9">
      <Link href="/login" className="flex items-center gap-3" aria-label="Về trang đăng nhập">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-peach shadow-brutal">
          <BookIcon size={24} />
        </span>
        <span className="inline-block -rotate-2 border-[2.5px] border-ink bg-lavender px-3 py-0.5 text-[22px] font-black tracking-tight shadow-brutal">
          MemorySave
        </span>
      </Link>
      <h1 className="mt-8 text-[28px] leading-tight font-black tracking-tight">Quên mật khẩu</h1>
      <p className="mt-2 text-base leading-relaxed font-medium text-body">
        Nhập email đã xác thực của tài khoản. Chúng tôi sẽ gửi mã 6 số để bạn đặt mật khẩu mới.
      </p>
      <ForgotPasswordForm />
      <p className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-center text-[13px] font-medium text-muted">
        <LockIcon size={16} />
        Riêng tư cho đến khi bạn chọn chia sẻ
      </p>
    </main>
  );
}
