"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodeStep, type CodeTicket } from "@/components/auth/CodeStep";
import { Button } from "@/components/ui/Button";
import { FormError, PasswordField, TextField } from "@/components/ui/Field";
import { GoogleButton, OrDivider } from "@/components/ui/GoogleButton";
import { api, ApiError } from "@/lib/api-client";
import { HOME_PATH } from "@/lib/routes";
import { msg } from "@/lib/messages";
import {
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  checkPasswordConfirm,
  checkUsername,
  collectErrors,
} from "@/lib/validation";

type Mode = "login" | "register";

/** Same rules as the server (src/lib/validation.ts) — caught here before any request is made. */
function formErrors(mode: Mode, form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const v = (k: string) => String(data.get(k) ?? "");
  if (mode === "login") {
    return collectErrors({
      username: v("username").trim() ? null : msg.usernameRequired,
      password: v("password") ? null : msg.passwordRequired,
    });
  }
  return collectErrors({
    username: checkUsername(v("username")),
    displayName: checkDisplayName(v("displayName")),
    email: checkEmail(v("email")),
    password: checkNewPassword(v("password")),
    confirmPassword: checkPasswordConfirm(v("password"), v("confirmPassword")),
  });
}

export function LoginForm({
  next,
  initialMode = "login",
  googleEnabled = false,
  initialError = null,
}: {
  next: string | null;
  initialMode?: Mode;
  googleEnabled?: boolean;
  initialError?: string | null; // from /login?error=google_* (002 research R9)
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [fields, setFields] = useState<Record<string, string>>({});
  // 005: sign-up is two steps — the form, then the e-mailed code. The draft keeps what was typed when going back.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<(CodeTicket & { email: string }) | null>(null);

  function done(target: string | null) {
    router.replace(target ?? HOME_PATH);
    router.refresh();
  }

  /** Typing in a field that shows an error re-checks it, so the message goes away as soon as it is fixed. */
  function onChange(e: React.FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    const watched = name === "password" ? ["password", "confirmPassword"] : [name];
    if (!watched.some((n) => fields[n])) return;
    const now = formErrors(mode, e.currentTarget);
    setFields((prev) => {
      const nextFields = { ...prev };
      for (const n of watched) {
        if (!prev[n]) continue;
        if (now[n]) nextFields[n] = now[n];
        else delete nextFields[n];
      }
      return nextFields;
    });
  }

  /** Leaving a filled-in field checks it right away (sign-up only; empty fields wait for the submit). */
  function onBlur(e: React.FocusEvent<HTMLFormElement>) {
    const target = e.target as unknown as HTMLInputElement;
    if (mode !== "register" || !target.name || !target.value) return;
    const problem = formErrors(mode, e.currentTarget)[target.name];
    setFields((prev) => {
      const nextFields = { ...prev };
      if (problem) nextFields[target.name] = problem;
      else delete nextFields[target.name];
      return nextFields;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (k: string) => String(form.get(k) ?? "");
    const problems = formErrors(mode, e.currentTarget);
    setError(null);
    setFields(problems);
    if (Object.keys(problems).length) {
      // Put the cursor on the first field that needs fixing.
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(problems)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      if (mode === "login") {
        await api("/api/auth/login", { body: { username: value("username"), password: value("password") } });
        return done(next);
      }
      const body = { username: value("username"), displayName: value("displayName"), email: value("email") };
      setDraft(body);
      const res = await api<CodeTicket>("/api/auth/register/start", { body: { ...body, password: value("password"), next } });
      setPending({ ...res, email: body.email.trim() });
      setBusy(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fields ? null : err.message);
        setFields(err.fields ?? {});
      }
      setBusy(false);
    }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => {
        setMode(m);
        setError(null);
        setFields({});
        setPending(null);
      }}
      className={`h-[42px] rounded-xl border-2 border-ink text-[15px] ${mode === m ? "bg-lavender font-extrabold shadow-brutal" : "bg-white font-semibold"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-7 flex flex-col gap-4 rounded-[20px] border-[2.5px] border-ink bg-white p-[18px] shadow-brutal-lg">
      <div role="tablist" aria-label="Chọn chế độ" className="grid grid-cols-2 gap-2">
        {tab("login", "Đăng nhập")}
        {tab("register", "Đăng ký")}
      </div>
      {pending ? (
        <CodeStep
          email={pending.email}
          ticket={pending}
          submitLabel="Tạo tài khoản"
          onBack={() => setPending(null)}
          onVerify={async (code) => {
            const res = await api<{ next: string | null }>("/api/auth/register/verify", {
              body: { ticket: pending.ticket, code },
            });
            done(res.next ?? next);
          }}
        />
      ) : (
        <form onSubmit={onSubmit} onChange={onChange} onBlur={onBlur} className="flex flex-col gap-3.5" noValidate>
          <TextField
            label="Tên đăng nhập"
            name="username"
            placeholder="vd: an_nguyen"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
            defaultValue={draft.username}
            error={fields.username}
            hint={
              mode === "register"
                ? "3–30 ký tự: chữ thường không dấu, số, dấu gạch dưới. Chỉ dùng để đăng nhập, không ai khác thấy."
                : undefined
            }
          />
          {mode === "register" && (
            <TextField
              label="Tên hiển thị"
              name="displayName"
              placeholder="vd: An Nguyễn"
              maxLength={50}
              required
              hint="Bạn bè sẽ thấy tên này. Mã kết bạn cũng được tạo từ tên này."
              defaultValue={draft.displayName}
              error={fields.displayName}
            />
          )}
          {mode === "register" && (
            <TextField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="vd: an@gmail.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={254}
              required
              hint="Chúng tôi gửi mã xác thực tới email này. Chỉ bạn thấy email của mình."
              defaultValue={draft.email}
              error={fields.email}
            />
          )}
          <PasswordField
            label="Mật khẩu"
            name="password"
            placeholder="Tối thiểu 8 ký tự"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            error={fields.password}
          />
          {mode === "register" && (
            <PasswordField
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu ở trên"
              autoComplete="new-password"
              required
              error={fields.confirmPassword}
            />
          )}
          {mode === "login" && (
            <Link href="/forgot-password" className="-mt-1 self-end text-sm font-bold underline underline-offset-2">
              Quên mật khẩu?
            </Link>
          )}
          <FormError message={error} />
          <Button type="submit" size="lg" className="mt-1.5" disabled={busy}>
            {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Gửi mã xác thực"}
          </Button>
        </form>
      )}
      {googleEnabled && !pending && (
        <>
          <OrDivider />
          <GoogleButton next={next} />
        </>
      )}
    </div>
  );
}
