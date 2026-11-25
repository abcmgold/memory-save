"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { FormError, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api-client";
import { MAX_BODY, MAX_TITLE, msg } from "@/lib/messages";
import type { AudienceInput, Entry, UserRef } from "@/lib/types";
import { PhotoGrid, itemsFromPhotos } from "./PhotoGrid";
import { AudienceField } from "@/components/camera/AudiencePicker";

type Props = {
  mode: "create" | "edit";
  entry?: Entry;
  /** current local "YYYY-MM-DDTHH:mm" in the app time zone, from the server */
  now: string;
  friends: UserRef[];
  defaultAudience: AudienceInput;
};

const DRAFT_KEY = "ms-draft-new-entry";

type Draft = { title: string; body: string; date: string; time: string };

function parseDraft(raw: string | null): Draft | null {
  try {
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};
function readDraftRaw(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

export function EntryForm({ mode, entry, now, friends, defaultAudience }: Props) {
  const router = useRouter();
  const initialAt = entry?.eventAt ?? now;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [date, setDate] = useState(initialAt.slice(0, 10));
  const [time, setTime] = useState(initialAt.slice(11, 16));
  const [audience, setAudience] = useState<AudienceInput>(
    entry?.audience
      ? { mode: entry.audience.mode, userIds: entry.audience.users.map((u) => u.id) }
      : defaultAudience,
  );
  const [photos, setPhotos] = useState<{ photoIds: string[]; busy: boolean }>({ photoIds: [], busy: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const initialPhotos = useMemo(() => itemsFromPhotos(entry?.photos ?? []), [entry]);
  const onPhotos = useCallback((s: { photoIds: string[]; busy: boolean }) => setPhotos(s), []);

  // Keep what the user typed if the session expires or the network drops (spec edge cases).
  // The draft present when the page opened is offered back explicitly instead of silently overwriting.
  const storedDraft = useSyncExternalStore(noopSubscribe, readDraftRaw, () => null);
  const [draftOffer] = useState(() => storedDraft);
  const [draftHandled, setDraftHandled] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Only offer the draft that existed before the user started typing on this page.
  const offered = mode === "create" && !draftHandled && !dirty ? parseDraft(draftOffer ?? storedDraft) : null;
  const showDraftOffer = !!offered && (offered.title.trim() !== "" || offered.body.trim() !== "");

  useEffect(() => {
    if (mode !== "create" || !dirty) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, date, time }));
    } catch {}
  }, [mode, dirty, title, body, date, time]);

  function restoreDraft() {
    if (!offered) return;
    setTitle(offered.title);
    setBody(offered.body);
    setDate(offered.date);
    setTime(offered.time);
    setDirty(true);
    setDraftHandled(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.busy) return;
    setSaving(true);
    setError(null);
    setFields({});
    const payload = {
      title: title || null,
      body: body || null,
      eventAt: `${date}T${time}`,
      photoIds: photos.photoIds,
      audience,
    };
    try {
      const res =
        mode === "create"
          ? await api<{ entry: Entry }>("/api/entries", { body: { ...payload, kind: "journal" } })
          : await api<{ entry: Entry }>(`/api/entries/${entry!.id}`, { method: "PATCH", body: payload });
      if (mode === "create") {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
      }
      router.push(mode === "create" ? `/journal?date=${res.entry.eventAt.slice(0, 10)}` : `/journal/${res.entry.id}`);
      router.refresh();
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Phiên đăng nhập đã hết hạn. Nội dung của bạn vẫn được giữ — hãy đăng nhập lại rồi quay về trang này.");
          return;
        }
        setFields(err.fields ?? {});
        setError(err.fields?._ ?? (err.fields ? null : err.message));
      }
    }
  }

  const today = now.slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col" noValidate>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-ink bg-cream px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3.5">
        <Link href={entry ? `/journal/${entry.id}` : "/journal"} className={buttonClass("secondary", "sm", "h-11 shadow-none")}>
          Hủy
        </Link>
        <h1 className="-rotate-2 border-[2.5px] border-ink bg-peach px-2.5 py-0.5 text-lg font-black uppercase shadow-brutal">
          {mode === "create" ? "Viết" : "Sửa"}
        </h1>
        <button type="submit" disabled={saving || photos.busy} className={buttonClass("accent", "sm", "h-11 px-[18px]")}>
          {saving ? "Đang lưu…" : photos.busy ? "Đang tải ảnh…" : "Lưu"}
        </button>
      </header>

      <div className="flex flex-col gap-[18px] px-4 pt-[18px] pb-8">
        {showDraftOffer && (
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-butter px-3 py-2.5 text-sm font-semibold">
            <span>Bạn có bản nháp chưa lưu.</span>
            <span className="flex gap-2">
              <button type="button" onClick={restoreDraft} className="font-extrabold underline underline-offset-2">
                Khôi phục
              </button>
              <button type="button" onClick={() => setDraftHandled(true)} className="text-muted underline underline-offset-2">
                Bỏ qua
              </button>
            </span>
          </div>
        )}
        <TextField
          label="Tiêu đề"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          maxLength={MAX_TITLE}
          placeholder="Hôm nay có gì đáng nhớ?"
          error={fields.title}
          inputClassName="text-[17px] font-bold shadow-brutal"
        />
        <div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Ngày"
              type="date"
              value={date}
              max={today}
              required
              onChange={(e) => setDate(e.target.value)}
              inputClassName="font-semibold"
            />
            <TextField
              label="Giờ"
              type="time"
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
              inputClassName="font-semibold"
            />
          </div>
          {fields.eventAt ? (
            <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">
              {fields.eventAt}
            </p>
          ) : (
            <p className="mt-1.5 text-xs font-medium text-muted">Mặc định là bây giờ. Có thể chọn ngày trong quá khứ.</p>
          )}
        </div>
        <TextArea
          label="Nội dung"
          rows={6}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setDirty(true);
          }}
          maxLength={MAX_BODY}
          placeholder="Viết vài dòng…"
          error={fields.body}
        />
        <PhotoGrid initial={initialPhotos} onChange={onPhotos} />
        {fields.photoIds && <p className="text-sm font-semibold text-danger">{fields.photoIds}</p>}
        <AudienceField value={audience} onChange={setAudience} friends={friends} />
        <FormError message={error} />
        {mode === "create" && photos.photoIds.length === 0 && !title.trim() && !body.trim() && (
          <p className="text-xs font-medium text-muted">{msg.entryEmpty}</p>
        )}
      </div>
    </form>
  );
}
