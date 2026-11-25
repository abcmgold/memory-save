// Pure — data-model.md › users.handle (FR-037): public, system-generated, never changes.

export const HANDLE_RE = /^[a-z0-9]+(\.[a-z0-9]+)*\.[0-9]{4,6}$/;
const MAX_BASE = 20;

/** "An Nguyễn" → "an.nguyen"; empty or no letters/digits → "ban". */
export function handleBase(displayName: string | null | undefined): string {
  const slug = (displayName ?? "")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  if (!slug) return "ban";
  if (slug.length <= MAX_BASE) return slug;
  // Cut at a word boundary when possible so we don't end with half a word.
  const cut = slug.slice(0, MAX_BASE);
  const lastDot = cut.lastIndexOf(".");
  return (lastDot > 0 ? cut.slice(0, lastDot) : cut).replace(/\.+$/, "");
}

export function formatHandle(base: string, digits: string): string {
  return `${base}.${digits}`;
}

export function isValidHandle(handle: string): boolean {
  return handle.length <= 32 && HANDLE_RE.test(handle);
}

export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}
