// Constitution V: 0004 (e-mail verification) keeps every account and turns old Google e-mails into verified ones.
// data-model.md › users.email, users.email_verified_at, users.username, users.password_hash; email_codes; email_sends
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

describe("migration 0004 (e-mail verification) on existing data", () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("keeps accounts, verifies old Google e-mails and enforces the new rules", async () => {
    const db = drizzle({ client });
    await migrate(db, { migrationsFolder: folderWithFirstMigrations(4) });
    await client.exec(`
      insert into users (username, password_hash, display_name, handle, invite_token, created_at)
      values ('old_one', 'hash-1', 'Người Cũ', 'nguoi.cu.1234', 'token-old-one-0000000000', '2026-01-01T00:00:00Z');
      insert into users (google_sub, google_email, display_name, handle, invite_token, created_at)
      values ('sub-1', ' An@Gmail.com ', 'An', 'an.1111', 'token-google-1-00000000000', '2026-02-02T00:00:00Z');
    `);

    await migrate(db, { migrationsFolder: ROOT });

    const rows = await client.query<Record<string, unknown>>(
      `select username, password_hash, google_sub, email, email_verified_at = created_at as verified_at_created
       from users order by handle`,
    );
    expect(rows.rows).toEqual([
      { username: null, password_hash: null, google_sub: "sub-1", email: "an@gmail.com", verified_at_created: true },
      { username: "old_one", password_hash: "hash-1", google_sub: null, email: null, verified_at_created: null },
    ]);

    // Both ways to sign in on one account is now allowed
    await client.query(
      `insert into users (username, password_hash, google_sub, email, email_verified_at, display_name, handle, invite_token)
       values ('both_ways', 'h', 'sub-2', 'both@gmail.com', now(), 'Y', 'y.3333', 'token-y-000000000000000')`,
    );
    // No login method at all
    await expect(
      client.query(`insert into users (display_name, handle, invite_token) values ('X', 'x.2222', 'token-x-000000000000000')`),
    ).rejects.toThrow(/users_login_method/);
    // Username without password
    await expect(
      client.query(
        `insert into users (username, display_name, handle, invite_token) values ('half', 'Z', 'z.4444', 'token-z-000000000000000')`,
      ),
    ).rejects.toThrow(/users_login_method/);
    // E-mail without verification time
    await expect(
      client.query(
        `insert into users (google_sub, email, display_name, handle, invite_token)
         values ('sub-3', 'c@gmail.com', 'C', 'c.6666', 'token-c-000000000000000')`,
      ),
    ).rejects.toThrow(/users_email_verified/);
    // Same e-mail twice
    await expect(
      client.query(
        `insert into users (google_sub, email, email_verified_at, display_name, handle, invite_token)
         values ('sub-4', 'an@gmail.com', now(), 'D', 'd.7777', 'token-d-000000000000000')`,
      ),
    ).rejects.toThrow(/users_email_unique/);
    // Overlong e-mail
    await expect(
      client.query(
        `insert into users (google_sub, email, email_verified_at, display_name, handle, invite_token)
         values ('sub-5', '${"a".repeat(255)}', now(), 'E', 'e.8888', 'token-e-000000000000000')`,
      ),
    ).rejects.toThrow(/users_email_length/);

    // New tables exist and check their rules
    await client.query(
      `insert into email_codes (ticket_hash, purpose, email, code_hash, delivery, sent_at, expires_at)
       values ('t1', 'signup', 'z@gmail.com', 'c1', 'code', now(), now() + interval '10 minutes')`,
    );
    await expect(
      client.query(
        `insert into email_codes (ticket_hash, purpose, email, code_hash, delivery, sent_at, expires_at)
         values ('t2', 'other', 'z@gmail.com', 'c2', 'code', now(), now())`,
      ),
    ).rejects.toThrow(/email_codes_purpose/);
    await client.query(`insert into email_sends (email, ip) values ('z@gmail.com', 'unknown')`);
    const n = await client.query<{ n: number }>("select count(*)::int as n from email_sends");
    expect(n.rows[0].n).toBe(1);
  });
});
