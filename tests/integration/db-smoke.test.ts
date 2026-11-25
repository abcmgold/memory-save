import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupTestDb, closeTestDb } from "../helpers/test-db";
import { schema } from "@/server/db/client";

describe("test database", () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(closeTestDb);

  it("applies migrations and computes event_date", async () => {
    const db = await setupTestDb();
    const [user] = await db
      .insert(schema.users)
      .values({ username: "smoke_user", displayName: "Smoke", passwordHash: "x", handle: "smoke.1234", inviteToken: "t".repeat(24) })
      .returning();
    const [entry] = await db
      .insert(schema.entries)
      .values({ ownerId: user.id, title: "t", eventAt: "2026-11-24 21:10:00" })
      .returning();
    expect(entry.eventDate).toBe("2026-11-24");
    expect(user.lastAudience).toEqual({ mode: "private", userIds: [] });
  });

  it("rejects an invalid username at the database level", async () => {
    const db = await setupTestDb();
    await expect(db.insert(schema.users).values({ username: "Bad Name", displayName: "Bad", passwordHash: "x", handle: "bad.1234", inviteToken: "u".repeat(24) })).rejects.toThrow();
  });
});
