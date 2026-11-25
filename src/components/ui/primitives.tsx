// Card, Sticker, Section label, Chip and Avatar — neo-brutalism primitives from the design.

export function Card({
  className = "",
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Tag className={`rounded-2xl border-2 border-ink bg-white shadow-brutal ${className}`} {...rest} />;
}

const stickerTones = {
  lavender: "bg-lavender",
  butter: "bg-butter",
  mint: "bg-mint",
  peach: "bg-peach",
} as const;

/** Tilted heavy title like a sticker (design: screen titles). */
export function Sticker({
  children,
  tone = "lavender",
  as: Tag = "h1",
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof stickerTones;
  as?: React.ElementType;
  className?: string;
}) {
  return (
    <Tag
      className={`inline-block -rotate-2 self-start border-[2.5px] border-ink px-3 py-0.5 text-2xl font-black uppercase shadow-brutal ${stickerTones[tone]} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Small boxed uppercase label used for day groups and sections. */
export function Label({
  children,
  tone = "bg-white",
  as: Tag = "h2",
  className = "",
  id,
}: {
  children: React.ReactNode;
  tone?: string;
  as?: React.ElementType;
  className?: string;
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={`inline-block self-start rounded-lg border-2 border-ink px-2.5 py-0.5 text-[13px] font-extrabold uppercase tracking-wide ${tone} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Chip({
  active,
  className = "",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-ink px-3.5 text-sm text-ink ${active ? "bg-lavender font-extrabold shadow-brutal" : "bg-white font-semibold"} ${className}`}
      {...rest}
    />
  );
}

const AVATAR_TONES = ["bg-sky", "bg-pink", "bg-mint", "bg-butter", "bg-lavender", "bg-peach"];

export function avatarTone(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({
  name,
  seed,
  size = 40,
  className = "",
}: {
  name: string;
  seed: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-extrabold ${avatarTone(seed)} ${className}`}
    >
      {initial}
    </span>
  );
}
