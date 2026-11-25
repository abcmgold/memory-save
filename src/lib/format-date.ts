// Vietnamese date/time labels for local "YYYY-MM-DDTHH:mm" values (no time-zone conversion — research.md R8).

const SHORT_DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const LONG_DOW = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function parts(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

const two = (n: number) => String(n).padStart(2, "0");

export function shiftDate(date: string, days: number): string {
  const { y, m, d } = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${two(t.getUTCMonth() + 1)}-${two(t.getUTCDate())}`;
}

/** "20:30" */
export function formatTime(local: string): string {
  return local.slice(11, 16);
}

/** "Thứ Ba, 25/11/2026" */
export function formatLongDate(date: string): string {
  const { y, m, d, dow } = parts(date);
  return `${LONG_DOW[dow]}, ${two(d)}/${two(m)}/${y}`;
}

/** "T3, 25/11" */
export function formatShortDate(date: string): string {
  const { m, d, dow } = parts(date);
  return `${SHORT_DOW[dow]}, ${two(d)}/${two(m)}`;
}

/** Day-group heading: "Hôm nay · T3, 25/11", "Hôm qua · T2, 24/11" or "T5, 20/11/2026" (other years). */
export function formatDayHeading(date: string, today: string): string {
  if (date === today) return `Hôm nay · ${formatShortDate(date)}`;
  if (date === shiftDate(today, -1)) return `Hôm qua · ${formatShortDate(date)}`;
  const label = formatShortDate(date);
  return date.slice(0, 4) === today.slice(0, 4) ? label : `${label}/${date.slice(0, 4)}`;
}

/** "T2, 24/11/2026 · 21:10" */
export function formatEventAt(local: string): string {
  return `${formatShortDate(local)}/${local.slice(0, 4)} · ${formatTime(local)}`;
}

export function shortDow(date: string): string {
  return SHORT_DOW[parts(date).dow];
}

/** Monday-based week (Mon..Sun) containing `date`. */
export function weekOf(date: string): string[] {
  const { dow } = parts(date);
  const monday = shiftDate(date, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
