"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api-client";
import { maskEmail } from "@/lib/mask-email";
import { checkCode } from "@/lib/validation";

// 005 research R10 — the "enter the 6-digit code" step shared by sign-up, forgot password and the /me e-mail card.

export type CodeTicket = { ticket: string; resendIn: number };

export function CodeStep({
  email,
  ticket,
  submitLabel,
  onVerify,
  onBack,
  backLabel = "Đổi email",
  extraFields,
  maybeNoAccount = false,
}: {
  email: string;
  ticket: CodeTicket;
  submitLabel: string;
  /** Sends the code (plus any extra fields) to the server; throw the ApiError to show it here. */
  onVerify: (code: string, form: FormData) => Promise<void>;
  onBack: () => void;
  backLabel?: string;
  /** Extra inputs inside the same form (e.g. the new password), given the server's field errors. */
  extraFields?: (fields: Record<string, string>) => React.ReactNode;
  /** Forgot password: never confirm that the address has an account (FR-E05). */
  maybeNoAccount?: boolean;
}) {
  const [wait, setWait] = useState(ticket.resendIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [dead, setDead] = useState(false); // 5 misses or expired: only "Gửi lại" helps

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\s+/g, "");
    setError(null);
    setNotice(null);
    const codeProblem = checkCode(code);
    if (codeProblem) {
      setFields({ code: codeProblem });
      return;
    }
    setBusy(true);
    setFields({});
    try {
      await onVerify(code, form);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "GONE") setDead(true);
        setError(err.fields ? null : err.message);
        setFields(err.fields ?? {});
      }
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    try {
      await api("/api/auth/codes/resend", { body: { ticket: ticket.ticket } });
      setDead(false);
      setWait(ticket.resendIn);
      setNotice("Đã gửi mã mới.");
    } catch (err) {
      if (!(err instanceof ApiError)) return;
      if (err.retryAfter) setWait(err.retryAfter);
      setError(err.code === "GONE" ? "Yêu cầu này đã hết hạn. Hãy quay lại và gửi mã mới." : err.message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
      <p className="rounded-xl border-2 border-ink bg-butter px-3 py-2.5 text-sm font-semibold">
        {maybeNoAccount ? "Nếu email " : "Đã gửi mã 6 số tới "}
        <span className="font-extrabold">{maskEmail(email)}</span>
        {maybeNoAccount ? " có tài khoản, mã 6 số đã được gửi tới đó." : "."} Không thấy thư? Kiểm tra cả thư mục Spam.
      </p>
      <TextField
        label="Mã xác thực"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="••••••"
        required
        autoFocus
        disabled={dead}
        inputClassName="text-center text-2xl font-black tracking-[0.4em]"
        error={fields.code}
      />
      {extraFields?.(fields)}
      <FormError message={error} />
      {notice && !error && <p className="text-sm font-semibold text-muted">{notice}</p>}
      <Button type="submit" size="lg" className="mt-1" disabled={busy || dead}>
        {busy ? "Đang kiểm tra…" : submitLabel}
      </Button>
      <div className="flex items-center justify-between gap-3 text-sm font-bold">
        <button type="button" onClick={onBack} className="underline underline-offset-2">
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={wait > 0}
          className="underline underline-offset-2 disabled:text-muted disabled:no-underline"
        >
          {wait > 0 ? `Gửi lại sau ${wait}s` : "Gửi lại mã"}
        </button>
      </div>
    </form>
  );
}
