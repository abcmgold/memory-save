// Pure — data-model.md › entries.title, entries.body, entries.event_at, entries.kind (FR-005..FR-007, FR-020)
import { MAX_BODY, MAX_CAPTION, MAX_PHOTOS_PER_ENTRY, MAX_TITLE, msg } from "@/lib/messages";
import { addMinutes, compareLocal, isLocalDateTime } from "./clock";
import type { EntryKind } from "../db/schema";

export type EntryInput = {
  title?: string | null;
  body?: string | null;
  eventAt?: string | null;
  kind: EntryKind;
  photoCount: number;
};

export type ValidEntry = { title: string | null; body: string | null; eventAt: string };

export type ValidationResult = { ok: true; value: ValidEntry } | { ok: false; errors: Record<string, string> };

/** Allowed clock skew between the writer's device and the server (research.md R8). */
const FUTURE_TOLERANCE_MIN = 1;

function clean(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  return t.length ? t : null;
}

/** `now` is the current local date-time in the app time zone ("YYYY-MM-DDTHH:mm"). */
export function validateEntry(input: EntryInput, now: string): ValidationResult {
  const errors: Record<string, string> = {};
  const title = clean(input.title);
  const body = clean(input.body);
  const eventAt = input.eventAt ?? now;

  if (input.kind === "quick") {
    // Quick posts: exactly one photo, short caption, no title (FR-020)
    if (title) errors.title = msg.validation;
    if (body && body.length > MAX_CAPTION) errors.body = msg.captionTooLong;
    if (input.photoCount !== 1) errors.photoIds = msg.quickNeedsOnePhoto;
  } else {
    if (title && title.length > MAX_TITLE) errors.title = msg.titleTooLong;
    if (body && body.length > MAX_BODY) errors.body = msg.bodyTooLong;
    if (input.photoCount > MAX_PHOTOS_PER_ENTRY) errors.photoIds = msg.tooManyPhotos;
  }

  if (!isLocalDateTime(eventAt)) {
    errors.eventAt = msg.eventAtFormat;
  } else if (compareLocal(eventAt, addMinutes(now, FUTURE_TOLERANCE_MIN)) > 0) {
    errors.eventAt = msg.eventInFuture;
  }

  if (Object.keys(errors).length === 0 && !title && !body && input.photoCount === 0) {
    errors._ = msg.entryEmpty;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title, body, eventAt } };
}
