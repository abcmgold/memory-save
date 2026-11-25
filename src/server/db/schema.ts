// Database schema — canonical definitions in specs/001-daily-journal/data-model.md
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type AudienceMode = "private" | "friends" | "custom";
export type LastAudience = { mode: AudienceMode; userIds: string[] };
export type EntryKind = "journal" | "quick";
export type PhotoStatus = "uploading" | "pending" | "attached";
export type PhotoFormat = "jpeg" | "png" | "webp" | "heif";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// data-model.md › users
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull().unique(), // private: login only (FR-038)
    handle: text("handle").notNull().unique(), // public, system-generated, fixed (FR-037)
    inviteToken: text("invite_token").notNull().unique(), // current friend-invite link secret (FR-039)
    displayName: text("display_name").notNull(), // required since rev 3.1 (FR-001)
    passwordHash: text("password_hash").notNull(),
    lastAudience: jsonb("last_audience")
      .$type<LastAudience>()
      .notNull()
      .default({ mode: "private", userIds: [] }),
    createdAt: createdAt(),
  },
  (t) => [
    check("users_username_format", sql`${t.username} ~ '^[a-z0-9_]{3,30}$'`),
    // String.raw keeps the backslashes so Postgres sees "\." (a literal dot), not "." (any character).
    check("users_handle_format", sql.raw(String.raw`"handle" ~ '^[a-z0-9]+(\.[a-z0-9]+)*\.[0-9]{4,6}$' AND char_length("handle") <= 32`)),
    check("users_display_name_length", sql`char_length(btrim(${t.displayName})) BETWEEN 1 AND 50`),
  ],
);

// data-model.md › sessions
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// data-model.md › login_attempts
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_username_idx").on(t.username, t.attemptedAt)],
);

// data-model.md › friend_requests
export const friendRequests = pgTable(
  "friend_requests",
  {
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.fromUserId, t.toUserId] }),
    index("friend_requests_to_idx").on(t.toUserId),
    check("friend_requests_not_self", sql`${t.fromUserId} <> ${t.toUserId}`),
  ],
);

// data-model.md › friendships (one row per pair, user_a_id < user_b_id)
export const friendships = pgTable(
  "friendships",
  {
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userAId, t.userBId] }),
    index("friendships_b_idx").on(t.userBId),
    check("friendships_ordered", sql`${t.userAId} < ${t.userBId}`),
  ],
);

// data-model.md › entries
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    body: text("body"),
    // Local wall-clock time chosen by the writer, minute precision, no time zone (research.md R8)
    eventAt: timestamp("event_at", { withTimezone: false, precision: 0, mode: "string" }).notNull(),
    eventDate: date("event_date", { mode: "string" })
      .notNull()
      .generatedAlwaysAs(sql`(event_at)::date`),
    kind: text("kind").$type<EntryKind>().notNull().default("journal"),
    audienceMode: text("audience_mode").$type<AudienceMode>().notNull().default("private"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("entries_owner_timeline_idx").on(t.ownerId, t.eventAt.desc(), t.createdAt.desc(), t.id.desc()),
    check("entries_kind", sql`${t.kind} IN ('journal','quick')`),
    check("entries_audience_mode", sql`${t.audienceMode} IN ('private','friends','custom')`),
    check("entries_title_length", sql`${t.title} IS NULL OR char_length(${t.title}) <= 200`),
    check("entries_body_length", sql`${t.body} IS NULL OR char_length(${t.body}) <= 20000`),
  ],
);

// data-model.md › photos
export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "set null" }),
    status: text("status").$type<PhotoStatus>().notNull().default("uploading"),
    position: integer("position").notNull().default(0),
    contentType: text("content_type").notNull(),
    format: text("format").$type<PhotoFormat>(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: createdAt(),
  },
  (t) => [
    index("photos_entry_idx").on(t.entryId, t.position),
    index("photos_uploader_status_idx").on(t.uploaderId, t.status),
    check("photos_status", sql`${t.status} IN ('uploading','pending','attached')`),
    check("photos_bytes", sql`${t.bytes} > 0 AND ${t.bytes} <= 10485760`),
    check("photos_format", sql`${t.format} IS NULL OR ${t.format} IN ('jpeg','png','webp','heif')`),
  ],
);

// data-model.md › entry_audience
export const entryAudience = pgTable(
  "entry_audience",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.userId] }), index("entry_audience_user_idx").on(t.userId, t.entryId)],
);

export type UserRow = typeof users.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
