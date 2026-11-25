// Constitution V: schema changes must not destroy existing data. Upgrades a DB that already has users.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const ROOT = path.resolve(__dirname, "../../drizzle");

function folderWithFirstMigrations(count: number): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-mig-"));
  fs.mkdirSync(path.join(dir, "meta"));
  const journal = JSON.parse(fs.readFileSync(path.join(ROOT, "meta/_journal.json"), "utf8"));
  journal.entries = journal.entries.slice(0, count);
  fs.writeFileSync(path.join(dir, "meta/_journal.json"), JSON.stringify(journal));
  for (const e of journal.entries) fs.copyFileSync(path.join(ROOT, `${e.tag}.sql`), path.join(dir, `${e.tag}.sql`));
  return dir;
}

describe("migrations 0001–0002 (handle, invite token, required display name) on existing data", () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("backfills unique, valid handles and tokens for existing users", async () => {
    const db = drizzle({ client });
    await migrate(db, { migrationsFolder: folderWithFirstMigrations(1) });
    await client.exec(`
      insert into users (username, password_hash) values ('old_one', 'x'), ('old_two', 'y');
      insert into entries (owner_id, title, event_at) select id, 'kept', '2026-11-01 10:00' from users;
    `);

    await migrate(db, { migrationsFolder: ROOT });

    const users = await client.query<{ username: string; handle: string; invite_token: string }>(
      "select username, handle, invite_token from users order by username",
    );
    // Same created_at for both rows → order between them is by id (random); compare as a set.
    expect(users.rows.map((u) => u.handle).sort()).toEqual(["ban.000001", "ban.000002"]);
    expect(new Set(users.rows.map((u) => u.invite_token)).size).toBe(2);
    expect(users.rows.every((u) => u.invite_token.length >= 32)).toBe(true);
    const entries = await client.query<{ n: number }>("select count(*)::int as n from entries");
    expect(entries.rows[0].n).toBe(2);

    // 0002: users without a display name get their handle as name
    const names = await client.query<{ display_name: string; handle: string }>("select display_name, handle from users");
    expect(names.rows.every((r) => r.display_name === r.handle)).toBe(true);

    // The format check really escapes the dots
    await expect(
      client.query("update users set handle = 'anxnguyenx1234' where username = 'old_one'"),
    ).rejects.toThrow();
  });
});
