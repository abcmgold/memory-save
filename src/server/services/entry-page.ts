import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "../http/errors";
import { uuidParam } from "../http/schemas";
import { getEntryForViewer } from "./entries";
import type { Entry } from "@/lib/types";

/** For pages: the entry if the viewer may see it, otherwise the 404 page (FR-031). */
export async function loadEntryOr404(viewerId: string, rawId: string): Promise<Entry> {
  const id = uuidParam.safeParse(rawId);
  if (!id.success) notFound();
  try {
    return await getEntryForViewer(viewerId, id.data);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }
}
