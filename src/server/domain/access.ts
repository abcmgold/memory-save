// Pure — data-model.md › "Quy tắc truy cập" (constitution II, FR-030/FR-031)

export type EntryFacts = {
  viewerId: string | null;
  ownerId: string;
  /** viewer has a row in entry_audience for this entry */
  inAudience: boolean;
  /** viewer and owner are currently friends */
  areFriends: boolean;
};

/** Owner, or (selected in the audience AND still friends) — double-checked against stale rows. */
export function canViewEntry(f: EntryFacts): boolean {
  if (!f.viewerId) return false;
  if (f.viewerId === f.ownerId) return true;
  return f.inAudience && f.areFriends;
}

/** Edit, delete, remove photos, change audience: owner only. */
export function canEditEntry(f: Pick<EntryFacts, "viewerId" | "ownerId">): boolean {
  return !!f.viewerId && f.viewerId === f.ownerId;
}

export type PhotoFacts = {
  viewerId: string | null;
  uploaderId: string;
  status: "uploading" | "pending" | "attached";
  /** present when the photo is attached to an entry */
  entry: EntryFacts | null;
};

export function canViewPhoto(f: PhotoFacts): boolean {
  if (!f.viewerId) return false;
  if (f.status !== "attached" || !f.entry) return f.viewerId === f.uploaderId;
  return canViewEntry(f.entry);
}
