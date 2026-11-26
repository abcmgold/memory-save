"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api-client";
import { MAX_DISPLAY_NAME } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";

export function GoogleSignupForm({ suggestedName, next }: { suggestedName: string; next: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const displayName = String(new FormData(e.currentTarget).get("displayName") ?? "");
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    try {
      const res = await api<{ next: string | null }>("/api/auth/google/complete", { body: { displayName } });
      router.replace(res.next ?? next ?? HOME_PATH);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        router.replace("/login?error=google_expired");
        return;
      }
      if (err instanceof ApiError) {
        setFieldError(err.fields?.displayName);
        setError(err.fields ? null : err.message);
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
      <TextField
        label="Tên hiển thị"
        name="displayName"
        placeholder="vd: An Nguyễn"
        defaultValue={suggestedName}
        maxLength={MAX_DISPLAY_NAME}
        autoComplete="name"
        required
        autoFocus={!suggestedName}
        hint="Bạn bè sẽ thấy tên này. Mã kết bạn cũng được tạo từ tên này."
        error={fieldError}
      />
      <FormError message={error} />
      <Button type="submit" size="lg" className="mt-1.5" disabled={busy}>
        {busy ? "Đang tạo tài khoản…" : "Bắt đầu"}
      </Button>
    </form>
  );
}
