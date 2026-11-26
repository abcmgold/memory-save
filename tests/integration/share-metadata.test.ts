// 003-seo-sharing FR-S07, FR-S08, FR-S09 — contracts/http.md › Thẻ <head>
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";
import { createUser } from "../helpers/factories";
import { getDb, schema } from "@/server/db/client";
import { generateMetadata } from "@/app/add/[token]/page";
import InviteImage from "@/app/add/[token]/opengraph-image";
import SiteImage from "@/app/opengraph-image";

describe("invite link share card (003 US2)", () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  beforeEach(resetTestDb);
  afterAll(closeTestDb);

  const tokenOf = async (id: string) =>
    (await getDb().select({ t: schema.users.inviteToken }).from(schema.users).where(eq(schema.users.id, id)))[0].t;
  const meta = (token: string) => generateMetadata({ params: Promise.resolve({ token }) });

  it("names the inviter for a valid link and stays noindex", async () => {
    const tuan = await createUser("bui_tuan", "Bùi Tuấn");
    const token = await tokenOf(tuan.id);
    const m = await meta(token);
    expect(m.title).toBe("Bùi Tuấn mời bạn kết bạn trên MemorySave");
    expect(m.openGraph).toMatchObject({
      title: "Bùi Tuấn mời bạn kết bạn trên MemorySave",
      siteName: "MemorySave", // a page's openGraph replaces the layout's — defaults must be kept
      locale: "vi_VN",
      type: "website",
      url: `/add/${token}`,
    });
    expect(m.description).toContain("Bùi Tuấn");
    expect(m.robots).toEqual({ index: false, follow: false });

    const json = JSON.stringify(m);
    expect(json).not.toContain("bui_tuan"); // username (FR-038)
    expect(json).not.toContain(tuan.handle); // only the display name goes into the card (FR-S09)
    // Opening the link (as a preview bot would) changes nothing
    expect(await getDb().select().from(schema.friendships)).toHaveLength(0);
  });

  it("falls back to the generic card for an unknown or malformed token", async () => {
    await createUser("bui_tuan", "Bùi Tuấn");
    for (const token of ["A".repeat(24), "nope", "../../etc"]) {
      const m = await meta(token);
      expect(m.title).toBe("Lời mời kết bạn · MemorySave");
      expect(JSON.stringify(m)).not.toContain("Bùi Tuấn");
      expect(m.robots).toEqual({ index: false, follow: false });
    }
  });

  it("renders PNG share images (site + invite, valid and invalid)", async () => {
    const tuan = await createUser("bui_tuan", "Bùi Tuấn");
    const token = await tokenOf(tuan.id);
    for (const res of [
      await SiteImage(),
      await InviteImage({ params: Promise.resolve({ token }) }),
      await InviteImage({ params: Promise.resolve({ token: "nope" }) }),
    ]) {
      expect(res.headers.get("content-type")).toBe("image/png");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(bytes.length).toBeGreaterThan(5_000);
      expect([...bytes.slice(1, 4)].map((b) => String.fromCharCode(b)).join("")).toBe("PNG");
    }
  });
});
