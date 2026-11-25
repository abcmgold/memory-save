"use client";

import { useEffect, useId, useRef } from "react";

/** Bottom sheet dialog (design: delete confirmation). Uses the native <dialog> for focus + Esc handling. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="mx-auto mb-0 mt-auto w-full max-w-[480px] rounded-t-3xl border-x-0 border-t-[2.5px] border-b-0 border-ink bg-cream p-0 text-ink backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-3 px-4 pb-9 pt-6">
        <h2 id={titleId} className="text-[19px] font-black">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
