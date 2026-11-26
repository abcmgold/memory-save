import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { BookIcon, CameraIcon, LockIcon, UsersIcon } from "@/components/ui/icons";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import {
  FAQ,
  FEATURES,
  jsonLd,
  jsonLdScript,
  LANDING_DESCRIPTION,
  LANDING_INTRO,
  LANDING_TITLE,
  STEPS,
  type FeatureIcon,
  type Tone,
} from "@/lib/landing-content";
import { OPEN_GRAPH_DEFAULTS, SITE_NAME } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { getGoogleConfig } from "@/server/env";

// 004-landing-page — public, static landing page at "/". Signed-in visitors never see it (src/proxy.ts → /camera).
export const metadata: Metadata = {
  title: { absolute: LANDING_TITLE },
  description: LANDING_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: LANDING_TITLE, description: LANDING_DESCRIPTION, url: "/" },
};

const ICONS: Record<FeatureIcon, (p: { size?: number }) => React.ReactNode> = {
  book: BookIcon,
  camera: CameraIcon,
  users: UsersIcon,
  lock: LockIcon,
};

const TONES: Record<Tone, string> = {
  sky: "bg-sky",
  peach: "bg-peach",
  mint: "bg-mint",
  lavender: "bg-lavender",
  butter: "bg-butter",
  pink: "bg-pink",
};

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[24px] leading-tight font-black tracking-tight">
      {children}
    </h2>
  );
}

function SignUpActions({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <LinkButton href="/login?mode=register" variant="primary" size="lg" className="w-full">
        Tạo tài khoản miễn phí
      </LinkButton>
      {googleEnabled && <GoogleButton className="w-full" />}
    </div>
  );
}

export default function LandingPage() {
  const googleEnabled = getGoogleConfig() !== null;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd(siteUrl())) }} />

      <header className="flex items-center justify-between gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} — trang chủ`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-peach shadow-brutal">
            <BookIcon size={20} />
          </span>
          <span className="-rotate-2 border-2 border-ink bg-lavender px-2.5 py-0.5 text-lg font-black tracking-tight shadow-brutal">
            {SITE_NAME}
          </span>
        </Link>
        <Link href="/login" className={buttonClass("secondary", "sm", "shadow-brutal")}>
          Đăng nhập
        </Link>
      </header>

      <main className="flex flex-col gap-14 px-5 pt-10 pb-12">
        <section aria-labelledby="hero-h" className="flex flex-col gap-6">
          <h1 id="hero-h" className="text-[34px] leading-[1.12] font-black tracking-tight">
            Ghi lại từng ngày,{" "}
            <span className="box-decoration-clone rounded-md bg-butter px-1.5">chia sẻ khoảnh khắc</span> với người thân.
          </h1>
          <p className="text-[17px] leading-relaxed font-medium text-body">{LANDING_INTRO}</p>
        </section>

        <PhoneMockup />

        <section aria-labelledby="features-h" className="flex flex-col gap-5">
          <SectionTitle id="features-h">Một nơi riêng cho ký ức của gia đình</SectionTitle>
          <ul className="flex flex-col gap-4">
            {FEATURES.map(({ icon, tone, title, body }) => {
              const Icon = ICONS[icon];
              return (
                <li key={title} className="flex gap-3.5 rounded-2xl border-2 border-ink bg-white p-4 shadow-brutal">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${TONES[tone]}`}
                  >
                    <Icon size={24} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[17px] font-extrabold">{title}</h3>
                    <p className="text-[15px] leading-relaxed font-medium text-body">{body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="steps-h" className="flex flex-col gap-5">
          <SectionTitle id="steps-h">Bắt đầu trong 3 bước</SectionTitle>
          <ol className="flex flex-col gap-3">
            {STEPS.map(({ title, body }, i) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-butter text-lg font-black shadow-brutal">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <h3 className="text-[17px] font-extrabold">{title}</h3>
                  <p className="text-[15px] leading-relaxed font-medium text-body">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq-h" className="flex flex-col gap-5">
          <SectionTitle id="faq-h">Câu hỏi thường gặp</SectionTitle>
          <div className="flex flex-col gap-3">
            {FAQ.map(({ question, answer }) => (
              <details key={question} className="group rounded-2xl border-2 border-ink bg-white shadow-brutal">
                <summary className="flex list-none items-center justify-between gap-3 px-4 py-3.5 text-[16px] font-extrabold [&::-webkit-details-marker]:hidden">
                  {question}
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-cream text-lg leading-none font-black transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="border-t-2 border-dashed border-ink px-4 py-3 text-[15px] leading-relaxed font-medium text-body">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="cta-h"
          className="flex flex-col gap-4 rounded-[20px] border-[2.5px] border-ink bg-lavender p-5 shadow-brutal-lg"
        >
          <h2 id="cta-h" className="text-[24px] leading-tight font-black tracking-tight">
            Bắt đầu lưu giữ khoảnh khắc hôm nay
          </h2>
          <p className="text-[15px] font-medium text-ink">Miễn phí. Riêng tư cho đến khi bạn chọn chia sẻ.</p>
          <SignUpActions googleEnabled={googleEnabled} />
        </section>
      </main>

      <footer className="flex flex-col items-center gap-2 border-t-2 border-ink px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))] text-center text-[13px] font-medium text-muted">
        <p className="flex items-center gap-1.5">
          <LockIcon size={16} /> Riêng tư cho đến khi bạn chọn chia sẻ
        </p>
        <p>
          © {SITE_NAME} ·{" "}
          <Link href="/login" className="font-bold text-ink underline underline-offset-2">
            Đăng nhập
          </Link>
        </p>
      </footer>
    </>
  );
}
