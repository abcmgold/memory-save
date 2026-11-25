// Pure — local wall-clock date-times "YYYY-MM-DDTHH:mm" in the app time zone (research.md R8).

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function partsIn(timeZone: string, at: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(at)) p[part.type] = part.value;
  return p;
}

/** Current local date-time in `timeZone`, minute precision. */
export function nowLocal(timeZone: string, at: Date = new Date()): string {
  const p = partsIn(timeZone, at);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function todayLocal(timeZone: string, at: Date = new Date()): string {
  return nowLocal(timeZone, at).slice(0, 10);
}

/** Treats a local value as if it were UTC — only for arithmetic, never for display. */
function toUtcMs(local: string): number {
  const m = LOCAL_RE.exec(local);
  if (!m) throw new Error(`Invalid local date-time: ${local}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function isLocalDateTime(value: string): boolean {
  const m = LOCAL_RE.exec(value);
  if (!m) return false;
  const [y, mo, d, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]];
  if (h > 23 || mi > 59) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isLocalDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  return !!m && isLocalDateTime(`${value}T00:00`);
}

export function addMinutes(local: string, minutes: number): string {
  return fromUtcMs(toUtcMs(local) + minutes * 60_000);
}

export function addDays(date: string, days: number): string {
  return addMinutes(`${date}T00:00`, days * 1440).slice(0, 10);
}

export function compareLocal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** API "YYYY-MM-DDTHH:mm" → Postgres timestamp literal. */
export function localToDb(local: string): string {
  return `${local.replace("T", " ")}:00`;
}

/** Postgres timestamp string ("YYYY-MM-DD HH:mm:ss" or ISO-like) → API "YYYY-MM-DDTHH:mm". */
export function dbToLocal(db: string): string {
  return db.replace(" ", "T").slice(0, 16);
}
