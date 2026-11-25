// npm run seed:local — demo accounts + sample data for LOCAL testing only (needs `npm run dev:local` running).
// Refuses to touch a Neon/remote database.
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import sharp from "sharp";
import { Pool } from "pg";
import { addMinutes, localToDb, nowLocal } from "../src/server/domain/clock";
import { formatHandle, handleBase } from "../src/server/domain/handle";

const URL = "postgres://postgres:postgres@127.0.0.1:5433/postgres";
const PASSWORD = "matkhau123";
const TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

const USERS = [
  { username: "an_nguyen", displayName: "An Nguyễn" },
  { username: "minh_tran", displayName: "Minh Trần" },
  { username: "lan_do", displayName: "Lan Đỗ" },
  { username: "khoa_pham", displayName: "Khoa Phạm" },
] as const;

async function makePhoto(color: string): Promise<{ id: string; width: number; height: number; bytes: number }> {
  const id = randomUUID();
  const dir = path.resolve(".data/photos", id);
  fs.mkdirSync(dir, { recursive: true });
  const base = sharp({ create: { width: 1200, height: 1500, channels: 3, background: color } });
  const original = await base.clone().jpeg({ quality: 85 }).toBuffer();
  fs.writeFileSync(path.join(dir, "original"), original);
  fs.writeFileSync(path.join(dir, "display.webp"), await sharp(original).webp({ quality: 82 }).toBuffer());
  fs.writeFileSync(path.join(dir, "thumb.webp"), await sharp(original).resize(384, 480).webp({ quality: 75 }).toBuffer());
  return { id, width: 1200, height: 1500, bytes: original.length };
}

async function main() {
  const pool = new Pool({ connectionString: URL });
  try {
    await pool.query("select 1");
  } catch {
    console.error("Không kết nối được DB local. Hãy chạy `npm run dev:local` ở một terminal khác trước.");
    process.exit(1);
  }
  // Already seeded? (the sample friends only exist after a seed)
  const { rows: seeded } = await pool.query("select 1 from users where username = 'minh_tran'");
  if (seeded.length) {
    console.log("Dữ liệu mẫu đã có sẵn. Muốn nạp lại từ đầu: dừng `npm run dev:local`, xóa thư mục .data/, chạy lại rồi seed.");
    await pool.end();
    return;
  }

  // Create the demo users; an existing account with the same username is reused and its password reset.
  const pw = await hash(PASSWORD, { algorithm: 2 });
  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const { rows } = await pool.query(
      `insert into users (username, display_name, password_hash, handle, invite_token) values ($1,$2,$3,$4,$5)
       on conflict (username) do update set display_name = excluded.display_name, password_hash = excluded.password_hash
       returning id`,
      [
        u.username,
        u.displayName,
        pw,
        formatHandle(handleBase(u.displayName), String(randomInt(0, 10000)).padStart(4, "0")),
        randomBytes(18).toString("base64url"),
      ],
    );
    ids[u.username] = rows[0].id;
  }
  const befriend = (a: string, b: string) => {
    const [x, y] = [ids[a], ids[b]].sort();
    return pool.query("insert into friendships (user_a_id, user_b_id) values ($1,$2) on conflict do nothing", [x, y]);
  };
  await befriend("an_nguyen", "minh_tran");
  await befriend("an_nguyen", "lan_do");
  await pool.query("insert into friend_requests (from_user_id, to_user_id) values ($1,$2) on conflict do nothing", [
    ids.khoa_pham,
    ids.an_nguyen,
  ]);

  const now = nowLocal(TZ);
  const at = (minutesAgo: number) => localToDb(addMinutes(now, -minutesAgo));

  async function entry(
    owner: string,
    e: { title?: string; body?: string; minutesAgo: number; kind?: "journal" | "quick"; mode: "private" | "friends" | "custom"; to?: string[]; photos?: string[] },
  ) {
    const { rows } = await pool.query(
      "insert into entries (owner_id, title, body, event_at, kind, audience_mode) values ($1,$2,$3,$4,$5,$6) returning id",
      [ids[owner], e.title ?? null, e.body ?? null, at(e.minutesAgo), e.kind ?? "journal", e.mode],
    );
    const entryId = rows[0].id;
    for (const [i, color] of (e.photos ?? []).entries()) {
      const p = await makePhoto(color);
      await pool.query(
        "insert into photos (id, uploader_id, entry_id, status, position, content_type, format, bytes, width, height) values ($1,$2,$3,'attached',$4,'image/jpeg','jpeg',$5,$6,$7)",
        [p.id, ids[owner], entryId, i, p.bytes, p.width, p.height],
      );
    }
    for (const viewer of e.to ?? []) {
      await pool.query("insert into entry_audience (entry_id, user_id) values ($1,$2)", [entryId, ids[viewer]]);
    }
  }

  // An: mix of private / all friends / one friend
  await entry("an_nguyen", { title: "Họp xong dự án mới", body: "Cuối cùng cũng chốt được phạm vi. Hơi mệt nhưng nhẹ người hẳn.", minutesAgo: 90, mode: "private" });
  await entry("an_nguyen", { kind: "quick", body: "Hoàng hôn ở hồ Tây", minutesAgo: 60 * 20, mode: "friends", to: ["minh_tran", "lan_do"], photos: ["#ffb38a"] });
  await entry("an_nguyen", { title: "Sinh nhật mẹ", body: "Cả nhà về đông đủ ăn tối. Mẹ cười suốt buổi, bảo năm nay là sinh nhật vui nhất.", minutesAgo: 60 * 26, mode: "custom", to: ["minh_tran"], photos: ["#ffc8dd", "#bde0fe", "#d7c8ff"] });
  await entry("an_nguyen", { title: "Đọc xong một cuốn sách", body: "Ghi lại vài ý hay để sau đọc lại.", minutesAgo: 60 * 24 * 5, mode: "private" });
  // Friends sharing with An
  await entry("minh_tran", { kind: "quick", body: "Cà phê đầu tuần", minutesAgo: 120, mode: "friends", to: ["an_nguyen"], photos: ["#cdeac0"] });
  await entry("lan_do", { title: "Buổi chạy đầu tiên sau kỳ nghỉ", body: "Chạy được 5 km quanh công viên, chân hơi mỏi nhưng tinh thần rất tốt.", minutesAgo: 60 * 3, mode: "custom", to: ["an_nguyen"], photos: ["#ffd6a5", "#a8d8ff"] });
  await entry("lan_do", { title: "Chỉ mình Lan xem", body: "An không được thấy bài này.", minutesAgo: 60 * 4, mode: "private" });

  const { rows: out } = await pool.query("select username, handle, display_name from users where username = any($1)", [
    USERS.map((u) => u.username),
  ]);
  await pool.end();
  console.log("✓ Đã nạp dữ liệu mẫu. Mật khẩu chung:", PASSWORD);
  for (const r of out) console.log(`  đăng nhập: ${r.username.padEnd(10)} mã định danh: @${r.handle.padEnd(18)} ${r.display_name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
