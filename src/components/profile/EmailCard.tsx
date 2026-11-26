"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { CodeStep, type CodeTicket } from "@/components/auth/CodeStep";
import { api, ApiError } from "@/lib/api-client";
import { msg } from "@/lib/messages";
import { checkEmail } from "@/lib/validation";

// 005 US4 — FR-E13, FR-E14: warning + "add e-mail" when there is none; otherwise the e-mail (owner only) + "Đổi".
export function EmailCard({ email }: { email: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState<CodeTicket | null>(null);

  function reset() {
    setEditing(false);
    setPending(null);
    setError(null);
    setFieldError(undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setDraft(value);
    setError(null);
    const problem = checkEmail(value);
    setFieldError(problem ?? undefined);
    if (problem) return;
    setBusy(true);
    try {
      setPending(await api<CodeTicket>("/api/me/email/start", { body: { email: value } }));
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldError(err.fields?.email);
        setError(err.fields ? null : err.message);
      }
    }
    setBusy(false);
  }

  const showForm = editing || !email;
  return (
    <section
      aria-label="Email"
      className={`flex flex-col gap-3 rounded-2xl border-2 border-ink p-3.5 shadow-brutal ${email ? "bg-white" : "bg-butter"}`}
    >
      {email ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <p className="text-xs font-extrabold tracking-wide text-muted uppercase">Email · chỉ bạn thấy</p>
            <p className="truncate text-[15px] font-bold">{email}</p>
          </div>
          {!editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Đổi
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[15px] leading-relaxed font-semibold">{msg.emailCardWarning}</p>
      )}

      {showForm &&
        (pending ? (
          <CodeStep
            email={draft}
            ticket={pending}
            submitLabel="Xác thực email"
            onBack={() => setPending(null)}
            onVerify={async (code) => {
              await api("/api/me/email/verify", { body: { ticket: pending.ticket, code } });
              reset();
              router.refresh();
            }}
          />
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <TextField
              label={email ? "Email mới" : "Email"}
              name="email"
              type="email"
              inputMode="email"
              placeholder="vd: an@gmail.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={254}
              required
              defaultValue={draft}
              error={fieldError}
            />
            <FormError message={error} />
            <div className="flex gap-2">
              {email && (
                <Button variant="secondary" className="flex-1" onClick={reset}>
                  Huỷ
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi mã"}
              </Button>
            </div>
          </form>
        ))}
    </section>
  );
}
