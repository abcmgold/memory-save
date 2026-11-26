import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/http/auth";
import { BookIcon, LockIcon } from "@/components/ui/icons";
import { safeNext } from "@/lib/safe-next";
import { HOME_PATH } from "@/lib/routes";
import { googleLoginErrorMessage } from "@/lib/messages";
import { OPEN_GRAPH_DEFAULTS, SITE_DESCRIPTION, SITE_NAME } from "@/lib/share-text";
import { getGoogleConfig } from "@/server/env";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập · MemorySave",
  description:
    "MemorySave — nhật ký hằng ngày riêng tư: viết, chụp và lưu lại từng khoảnh khắc, chỉ chia sẻ với người thân bạn chọn.",
  alternates: { canonical: "/login" }, // folds the ?next= / ?error= variants (004 FR-L09)
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: SITE_NAME, description: SITE_DESCRIPTION, url: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const { next: rawNext, mode, error } = await searchParams;
  const next = safeNext(rawNext);
  if (await getCurrentUser()) redirect(next ?? HOME_PATH);
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
        {next?.startsWith("/add/")
          ? "Đăng nhập hoặc tạo tài khoản để hoàn tất kết bạn."
          : "Ghi lại từng ngày, chia sẻ khoảnh khắc với người thân."}
      </p>
      <LoginForm
        next={next}
        initialMode={mode === "register" ? "register" : "login"}
        googleEnabled={getGoogleConfig() !== null}
        initialError={googleLoginErrorMessage(error)}
      />
      <p className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-center text-[13px] font-medium text-muted">
        <LockIcon size={16} />
        Riêng tư cho đến khi bạn chọn chia sẻ
      </p>
    </main>
  );
}
