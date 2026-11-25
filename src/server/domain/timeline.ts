// Pure — ordering, day grouping and keyset cursors (research.md R9)
import { addDays, isLocalDate, isLocalDateTime } from "./clock";

export const PAGE_SIZE = 20;

/** eventAt: local "YYYY-MM-DDTHH:mm"; createdAt: Postgres timestamptz text (full precision); id: uuid. */
export type TimelineKey = { eventAt: string; createdAt: string; id: string };

/** Sort comparator for newest-first: event time, then creation time, then id — all descending. */
export function compareTimeline(a: TimelineKey, b: TimelineKey): number {
  if (a.eventAt !== b.eventAt) return a.eventAt < b.eventAt ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export function groupByDay<T extends { eventAt: string }>(items: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const date = item.eventAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(item);
    else groups.push({ date, items: [item] });
  }
  return groups;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(key: TimelineKey): string {
  return Buffer.from(JSON.stringify([key.eventAt, key.createdAt, key.id])).toString("base64url");
}

export function decodeCursor(cursor: string): TimelineKey | null {
  try {
    const raw = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Array.isArray(raw) || raw.length !== 3) return null;
    const [eventAt, createdAt, id] = raw;
    if (typeof eventAt !== "string" || !isLocalDateTime(eventAt)) return null;
    if (typeof createdAt !== "string" || createdAt.length > 40 || !/^\d{4}-\d{2}-\d{2}/.test(createdAt)) return null;
    if (typeof id !== "string" || !UUID_RE.test(id)) return null;
    return { eventAt, createdAt, id };
  } catch {
    return null;
  }
}

/** Exclusive upper bound for "jump to date": everything strictly before the next day's midnight. */
export function dateUpperBound(date: string): string {
  if (!isLocalDate(date)) throw new Error(`Invalid date: ${date}`);
  return `${addDays(date, 1)}T00:00`;
}
