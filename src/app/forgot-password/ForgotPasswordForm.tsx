"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, PasswordField, TextField } from "@/components/ui/Field";
import { CodeStep, type CodeTicket } from "@/components/auth/CodeStep";
import { api, ApiError } from "@/lib/api-client";
import { HOME_PATH } from "@/lib/routes";
import { msg } from "@/lib/messages";
import { checkEmail, checkNewPassword, checkPasswordConfirm, collectErrors } from "@/lib/validation";

// 005 US3 — e-mail → code + new password → signed in (research R10)
export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState<CodeTicket | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setEmail(value);
    setError(null);
    const problem = checkEmail(value);
    setFieldError(problem ?? undefined);
    if (problem) return;
    setBusy(true);
    try {
      setPending(await api<CodeTicket>("/api/auth/password-reset/start", { body: { email: value } }));
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldError(err.fields?.email);
        setError(err.fields ? null : err.message);
      }
    }
    setBusy(false);
  }

  return (
    <div className="mt-7 flex flex-col gap-4 rounded-[20px] border-[2.5px] border-ink bg-white p-[18px] shadow-brutal-lg">
      {pending ? (
        <CodeStep
          email={email}
          ticket={pending}
          submitLabel="Đặt mật khẩu mới"
          maybeNoAccount
          onBack={() => setPending(null)}
          extraFields={(fields) => (
            <>
              <PasswordField
                label="Mật khẩu mới"
                name="password"
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                required
                hint="Sau khi đổi, mọi thiết bị khác sẽ bị đăng xuất."
                error={fields.password}
              />
              <PasswordField
                label="Nhập lại mật khẩu mới"
                name="confirmPassword"
                autoComplete="new-password"
                required
                error={fields.confirmPassword}
              />
            </>
          )}
          onVerify={async (code, form) => {
            const password = String(form.get("password") ?? "");
            const problems = collectErrors({
              password: checkNewPassword(password),
              confirmPassword: checkPasswordConfirm(password, String(form.get("confirmPassword") ?? "")),
            });
            // Shown by CodeStep like a server field error; no request is made.
            if (Object.keys(problems).length) throw new ApiError(400, "VALIDATION", msg.validation, problems);
            await api("/api/auth/password-reset/verify", { body: { ticket: pending.ticket, code, password } });
            router.replace(HOME_PATH);
            router.refresh();
          }}
        />
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
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
            autoFocus
            defaultValue={email}
            error={fieldError}
          />
          <FormError message={error} />
          <Button type="submit" size="lg" className="mt-1" disabled={busy}>
            {busy ? "Đang gửi…" : "Gửi mã"}
          </Button>
          <Link href="/login" className="text-center text-sm font-bold underline underline-offset-2">
            Quay lại đăng nhập
          </Link>
        </form>
      )}
    </div>
  );
}
