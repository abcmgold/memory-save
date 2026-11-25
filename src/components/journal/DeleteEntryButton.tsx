"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { FormError } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api-client";

/** "Xóa bài này" with a confirmation sheet (FR-009, constitution V). */
export function DeleteEntryButton({ entryId, title, detail }: { entryId: string; title: string; detail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/entries/${entryId}`, { method: "DELETE" });
      router.replace("/journal");
      router.refresh();
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : "Không xóa được.");
    }
  }

  return (
    <>
      <Button variant="secondary" className="mt-1.5 text-danger" onClick={() => setOpen(true)}>
        Xóa bài này
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Xóa “${title}”?`}>
        <p className="mb-1.5 text-sm leading-normal text-body">{detail}</p>
        <FormError message={error} />
        <Button variant="danger" size="lg" onClick={confirm} disabled={busy}>
          {busy ? "Đang xóa…" : "Xóa vĩnh viễn"}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setOpen(false)} disabled={busy}>
          Giữ lại
        </Button>
      </Sheet>
    </>
  );
}
