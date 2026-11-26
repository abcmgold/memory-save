"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

const inputBase =
  "w-full rounded-xl border-2 border-ink bg-white px-3.5 text-base text-ink outline-none focus-visible:shadow-brutal";

type Common = { label: React.ReactNode; error?: string; hint?: React.ReactNode; className?: string };

export function TextField({
  label,
  error,
  hint,
  className = "",
  inputClassName = "",
  ...rest
}: Common & React.InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputBase} h-12 ${inputClassName}`}
        {...rest}
      />
      {hint && !error && <p className="text-xs font-medium text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A password input with a show/hide toggle (the toggle never submits the form). */
export function PasswordField({
  label,
  error,
  hint,
  className = "",
  ...rest
}: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputBase} h-12 pr-12`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-1 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-cream"
        >
          {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </div>
      {hint && !error && <p className="text-xs font-medium text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  error,
  hint,
  className = "",
  ...rest
}: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputBase} resize-none py-3 leading-relaxed`}
        {...rest}
      />
      {hint && !error && <p className="text-xs font-medium text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border-2 border-ink bg-coral/40 px-3 py-2 text-sm font-semibold">
      {message}
    </p>
  );
}
