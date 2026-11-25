import Link from "next/link";

type Variant = "primary" | "secondary" | "accent" | "danger" | "ghost";
type Size = "md" | "lg" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-peach shadow-brutal",
  secondary: "bg-white",
  accent: "bg-mint shadow-brutal",
  danger: "bg-coral shadow-brutal",
  ghost: "bg-transparent border-transparent",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3 text-sm rounded-[10px]",
  md: "h-12 px-4 text-[15px] rounded-xl",
  lg: "h-14 px-5 text-base rounded-2xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex items-center justify-center gap-2 border-2 border-ink font-extrabold text-ink",
    "transition-transform active:translate-x-px active:translate-y-px active:shadow-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  ].join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className = "", ...rest }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/** Round/square icon-only button; always pass aria-label. */
export function IconButton({
  className = "",
  tone = "bg-white",
  round = true,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string; round?: boolean }) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink text-ink shadow-brutal transition-transform active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50 ${round ? "rounded-full" : "rounded-[14px]"} ${tone} ${className}`}
      {...rest}
    />
  );
}
