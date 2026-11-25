"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Chip } from "@/components/ui/primitives";
import { CheckIcon, ChevronRightIcon, LockIcon, UserIcon, UsersIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import type { AudienceInput, UserRef } from "@/lib/types";

// FR-026/FR-027 — the choice is always visible before posting (constitution II).

export function audienceSummary(value: AudienceInput, friends: UserRef[]): string {
  if (value.mode === "friends") return "Tất cả bạn bè";
  if (value.mode === "custom" && value.userIds?.length) {
    const n = value.userIds.length;
    return n === 1 ? (friends.find((f) => f.id === value.userIds![0])?.displayName ?? "1 bạn") : `${n} bạn`;
  }
  return "Chỉ mình tôi";
}

/** Chips (private / all friends / choose) + friend avatars (design "Xem lại & chọn người xem"). */
export function AudiencePicker({
  value,
  onChange,
  friends,
  compact = false,
}: {
  value: AudienceInput;
  onChange: (v: AudienceInput) => void;
  friends: UserRef[];
  /** One-row segmented control; friend avatars only while choosing (quick-post review screen). */
  compact?: boolean;
}) {
  const [choosing, setChoosing] = useState(value.mode === "custom");
  const selected = new Set(value.mode === "custom" ? (value.userIds ?? []) : value.mode === "friends" ? friends.map((f) => f.id) : []);
  const mode = value.mode === "custom" && !value.userIds?.length && !choosing ? "private" : value.mode;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChoosing(true);
    onChange({ mode: "custom", userIds: [...next] });
  }

  if (compact) {
    const seg = (on: boolean) =>
      `flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 border-ink px-1.5 text-[13px] disabled:opacity-40 ${on ? "bg-lavender font-extrabold shadow-brutal" : "bg-white font-semibold"}`;
    const showAvatars = friends.length > 0 && (choosing || mode === "custom");
    return (
      <div className="flex flex-col gap-2.5">
        <div role="group" aria-label="Ai được xem" className="grid grid-cols-3 gap-2">
          <button
            type="button"
            aria-pressed={mode === "private" && !choosing}
            aria-label="Chỉ mình tôi"
            className={seg(mode === "private" && !choosing)}
            onClick={() => {
              setChoosing(false);
              onChange({ mode: "private", userIds: [] });
            }}
          >
            <LockIcon size={15} strokeWidth={2.2} className="shrink-0" />
            <span className="truncate">Chỉ tôi</span>
          </button>
          <button
            type="button"
            aria-pressed={mode === "friends"}
            aria-label="Tất cả bạn bè"
            className={seg(mode === "friends")}
            onClick={() => {
              setChoosing(false);
              onChange({ mode: "friends", userIds: [] });
            }}
          >
            <UsersIcon size={15} strokeWidth={2.2} className="shrink-0" />
            <span className="truncate">Bạn bè</span>
          </button>
          <button
            type="button"
            aria-pressed={choosing || mode === "custom"}
            aria-label="Chọn bạn"
            disabled={friends.length === 0}
            className={seg(choosing || mode === "custom")}
            onClick={() => {
              setChoosing(true);
              onChange({ mode: "custom", userIds: [...selected] });
            }}
          >
            <UserIcon size={15} strokeWidth={2.2} className="shrink-0" />
            <span className="truncate">Chọn bạn</span>
          </button>
        </div>
        {friends.length === 0 && (
          <p className="truncate text-[13px] font-medium text-muted">
            Chưa có bạn bè nên chỉ bạn xem được ·{" "}
            <Link href="/friends" className="font-extrabold text-ink underline underline-offset-2">
              Thêm bạn
            </Link>
          </p>
        )}
        {showAvatars && (
          <div role="group" aria-label="Chọn bạn được xem" className="no-scrollbar flex gap-3.5 overflow-x-auto px-1 pt-1">
            {friends.map((f) => {
              const on = selected.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  aria-pressed={on}
                  aria-label={`${f.displayName} — ${on ? "được xem" : "không được xem"}`}
                  className="relative flex w-12 shrink-0 flex-col items-center gap-1"
                >
                  <Avatar name={f.displayName} seed={f.id} size={44} className={on ? "shadow-brutal" : "opacity-35"} />
                  {on && (
                    <span className="absolute -top-1 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white">
                      <CheckIcon size={11} />
                    </span>
                  )}
                  <span className="w-full truncate text-center text-[11px] font-semibold">{f.displayName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Chip
          active={mode === "private" && !choosing}
          onClick={() => {
            setChoosing(false);
            onChange({ mode: "private", userIds: [] });
          }}
        >
          <LockIcon size={16} strokeWidth={2.2} /> Chỉ mình tôi
        </Chip>
        <Chip
          active={mode === "friends"}
          onClick={() => {
            setChoosing(false);
            onChange({ mode: "friends", userIds: [] });
          }}
        >
          <UsersIcon size={16} strokeWidth={2.2} /> Tất cả bạn bè
        </Chip>
        <Chip
          active={choosing || mode === "custom"}
          disabled={friends.length === 0}
          onClick={() => {
            setChoosing(true);
            onChange({ mode: "custom", userIds: [...selected] });
          }}
        >
          <UserIcon size={16} strokeWidth={2.2} /> Chọn bạn…
        </Chip>
      </div>
      {friends.length === 0 ? (
        <p className="text-sm font-medium text-muted">
          Bạn chưa có bạn bè nên chỉ mình bạn xem được.{" "}
          <Link href="/friends" className="font-extrabold text-ink underline underline-offset-2">
            Thêm bạn
          </Link>
        </p>
      ) : (
        <div role="group" aria-label="Chọn bạn được xem" className="no-scrollbar flex gap-4 overflow-x-auto px-1 pt-1.5 pb-1">
          {friends.map((f) => {
            const on = selected.has(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                aria-pressed={on}
                aria-label={`${f.displayName} — ${on ? "được xem" : "không được xem"}`}
                className="relative flex w-14 shrink-0 flex-col items-center gap-1.5"
              >
                <Avatar
                  name={f.displayName}
                  seed={f.id}
                  size={54}
                  className={on ? "shadow-brutal" : "opacity-35"}
                />
                {on && (
                  <span className="absolute -top-1 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink text-white">
                    <CheckIcon size={12} />
                  </span>
                )}
                <span className="w-full truncate text-center text-xs font-semibold">{f.displayName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact row for the full entry form; opens the picker in a sheet (design "Viết nhật ký"). */
export function AudienceField({
  value,
  onChange,
  friends,
}: {
  value: AudienceInput;
  onChange: (v: AudienceInput) => void;
  friends: UserRef[];
}) {
  const [open, setOpen] = useState(false);
  const shared = value.mode === "friends" || (value.mode === "custom" && !!value.userIds?.length);
  const names =
    value.mode === "custom"
      ? (value.userIds ?? [])
          .map((id) => friends.find((f) => f.id === id)?.displayName)
          .filter(Boolean)
          .join(", ")
      : value.mode === "friends"
        ? `${friends.length} bạn hiện tại`
        : "Không ai khác xem được";

  return (
    <div id="audience" className="flex flex-col gap-1.5">
      <span className="text-sm font-extrabold">Ai được xem</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[60px] items-center gap-3 rounded-[14px] border-2 border-ink bg-white px-3.5 text-left shadow-brutal"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-lavender">
          {shared ? <UsersIcon size={18} /> : <LockIcon size={18} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-extrabold">{audienceSummary(value, friends)}</span>
          <span className="truncate text-xs font-medium text-muted">{names}</span>
        </span>
        <ChevronRightIcon size={18} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ai được xem?">
        <AudiencePicker value={value} onChange={onChange} friends={friends} />
        <Button size="lg" className="mt-2" onClick={() => setOpen(false)}>
          Xong
        </Button>
      </Sheet>
    </div>
  );
}
