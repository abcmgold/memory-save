// API shapes shared by server and client — contracts/api.md › Kiểu dùng chung
export type UserRef = { id: string; handle: string; displayName: string }; // never the username (FR-038)
export type PhotoRef = { id: string; width: number; height: number; thumbUrl: string; displayUrl: string };
export type AudienceMode = "private" | "friends" | "custom";
export type Audience = { mode: AudienceMode; users: UserRef[] };
export type AudienceInput = { mode: AudienceMode; userIds?: string[] };
export type Entry = {
  id: string;
  title: string | null;
  body: string | null;
  eventAt: string; // "YYYY-MM-DDTHH:mm" local
  kind: "journal" | "quick";
  author: UserRef;
  photos: PhotoRef[];
  isOwner: boolean;
  audience?: Audience; // owner only
  createdAt: string;
  updatedAt: string;
};
export type Page<T> = { items: T[]; nextCursor: string | null };
