"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { GoogleButton, OrDivider } from "@/components/ui/GoogleButton";
import { api, ApiError } from "@/lib/api-client";

type Mode = "login" | "register";

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        body: {
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
          ...(mode === "register" ? { displayName: String(form.get("displayName") ?? "") } : {}),
        },
      });
      router.replace(next ?? "/");
      router.refresh();
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
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
        <TextField
          label="Tên đăng nhập"
          name="username"
          placeholder="vd: an_nguyen"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
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
            error={fields.displayName}
          />
        )}
        <TextField
          label="Mật khẩu"
          name="password"
          type="password"
          placeholder="Tối thiểu 8 ký tự"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          error={fields.password}
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="mt-1.5" disabled={busy}>
          {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleButton next={next} />
        </>
      )}
    </div>
  );
}
