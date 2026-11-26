// Constitution V: 0003 (Google login) must keep every existing account intact and enforce one login method.
// data-model.md › users.username, users.password_hash, users.google_sub, users.google_email; pending_google_signups
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

describe("migration 0003 (Google login) on existing data", () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("keeps password accounts intact and enforces exactly one login method", async () => {
    const db = drizzle({ client });
    await migrate(db, { migrationsFolder: folderWithFirstMigrations(3) });
    await client.exec(`
      insert into users (username, password_hash, display_name, handle, invite_token)
      values ('old_one', 'hash-1', 'Người Cũ', 'nguoi.cu.1234', 'token-old-one-0000000000');
    `);

    await migrate(db, { migrationsFolder: folderWithFirstMigrations(4) }); // the state right after 0003 (0004 relaxes these rules)

    const old = await client.query<Record<string, unknown>>(
      "select username, password_hash, display_name, handle, google_sub, google_email from users",
    );
    expect(old.rows).toEqual([
      {
        username: "old_one",
        password_hash: "hash-1",
        display_name: "Người Cũ",
        handle: "nguoi.cu.1234",
        google_sub: null,
        google_email: null,
      },
    ]);

    // A Google-only account: no username, no password
    await client.query(
      `insert into users (google_sub, google_email, display_name, handle, invite_token)
       values ('sub-1', 'a@gmail.com', 'An', 'an.1111', 'token-google-1-00000000000')`,
    );

    // No login method at all
    await expect(
      client.query(`insert into users (display_name, handle, invite_token) values ('X', 'x.2222', 'token-x-000000000000000')`),
    ).rejects.toThrow(/users_one_login_method/);
    // Both methods at once
    await expect(
      client.query(
        `insert into users (username, password_hash, google_sub, display_name, handle, invite_token)
         values ('both_ways', 'h', 'sub-2', 'Y', 'y.3333', 'token-y-000000000000000')`,
      ),
    ).rejects.toThrow(/users_one_login_method/);
    // Username without password
    await expect(
      client.query(
        `insert into users (username, display_name, handle, invite_token) values ('half', 'Z', 'z.4444', 'token-z-000000000000000')`,
      ),
    ).rejects.toThrow(/users_one_login_method/);
    // Same Google account twice
    await expect(
      client.query(
        `insert into users (google_sub, google_email, display_name, handle, invite_token)
         values ('sub-1', 'b@gmail.com', 'B', 'b.5555', 'token-b-000000000000000')`,
      ),
    ).rejects.toThrow(/users_google_sub_unique/);
    // Overlong e-mail
    await expect(
      client.query(
        `insert into users (google_sub, google_email, display_name, handle, invite_token)
         values ('sub-3', '${"a".repeat(321)}', 'C', 'c.6666', 'token-c-000000000000000')`,
      ),
    ).rejects.toThrow(/users_google_email_length/);

    // The pending sign-up table exists
    await client.query(
      `insert into pending_google_signups (token_hash, google_sub, google_email, suggested_name, next, expires_at)
       values ('h1', 'sub-9', 'z@gmail.com', 'Zed', null, now() + interval '10 minutes')`,
    );
    const pending = await client.query<{ n: number }>("select count(*)::int as n from pending_google_signups");
    expect(pending.rows[0].n).toBe(1);
  });
});
