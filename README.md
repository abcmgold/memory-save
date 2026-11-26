# MemorySave

Nhật ký hằng ngày và chia sẻ khoảnh khắc với bạn bè: viết nhật ký kèm ảnh, xem lại theo timeline,
đăng nhanh bằng camera, kết bạn bằng mã định danh hoặc link và chọn ai được xem từng bài. Đăng ký bằng tên đăng nhập kèm
email xác thực (mã 6 số), hoặc bằng Google; quên mật khẩu thì lấy lại qua email.

- Spec, plan, API: [`specs/001-daily-journal/`](specs/001-daily-journal/) · Đăng nhập Google: [`specs/002-google-login/`](specs/002-google-login/)
  · Email xác thực + quên mật khẩu: [`specs/005-email-verification/`](specs/005-email-verification/)
- Thiết kế giao diện: https://claude.ai/artifact/R54gKMFCQv1fsT3R8xAz9o
- Nguyên tắc dự án: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

**Trang**: `/` giới thiệu công khai · `/login` đăng nhập/đăng ký · `/forgot-password` quên mật khẩu · `/camera` Chụp (trang chính trong app) · `/journal`
Nhật ký · `/moments` Khoảnh khắc · `/me` Cá nhân · `/add/<token>` link kết bạn. Route luôn đặt bằng tiếng Anh.

**Công nghệ**: Next.js 16 (App Router) · PostgreSQL (Neon) + Drizzle · Cloudflare R2 (ảnh) · Tailwind CSS v4 · Vitest.

## Chạy thử ngay, không cần tài khoản (chế độ local)

```bash
npm install
npm run dev:local          # http://localhost:3000
```

Dùng Postgres nhúng (PGlite) và lưu ảnh trong `~/.memorysave-local/` (ngoài thư mục dự án). Muốn có sẵn tài khoản test (mật khẩu `matkhau123`), chạy
`npm run seed:local` ở terminal khác khi server đang chạy. Làm lại từ đầu: dừng server rồi xóa
`~/.memorysave-local/` (đừng xóa khi server đang chạy).
Chế độ này tự chặn khi chạy production. Camera hoạt động trên `localhost`.

**Đăng nhập bằng Google (tùy chọn)**: thêm `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` vào `.env.local` (cách tạo:
[`docs/DEPLOY.md`](docs/DEPLOY.md) mục 3.1, redirect URI `http://localhost:3000/api/auth/google/callback`) rồi khởi
động lại server. Không có hai biến này thì nút Google tự ẩn. Tắt server bằng **Ctrl+C** để DB local được đóng đúng cách.

**Mã xác thực email**: ở chế độ local, thư không được gửi thật — mã 6 số được in ra terminal đang chạy server (dòng
`[mail] to=… subject=123456 là mã MemorySave của bạn`). Muốn thử gửi thật: đặt `SMTP_USER`, `SMTP_PASS` và
`MAIL_TRANSPORT=smtp` trong `.env.local` (cách tạo: [`docs/DEPLOY.md`](docs/DEPLOY.md) mục 3.2).

## Kiểm thử

```bash
npm test                   # unit + integration (PGlite + kho ảnh giả), không cần mạng
npm run typecheck && npm run lint
```

## Triển khai miễn phí: Vercel + Neon + Cloudflare R2

> Hướng dẫn từng bước chi tiết (kèm checklist kiểm tra và xử lý sự cố): [`docs/DEPLOY.md`](docs/DEPLOY.md)

1. **Neon**: tạo project (region Singapore), lấy connection string *pooled* → `DATABASE_URL`.
2. **Cloudflare R2**: tạo bucket (vd. `memorysave-photos`), **không** bật public access. Tạo API token quyền
   *Object Read & Write* cho bucket → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`; ghi lại `R2_ACCOUNT_ID`.
   Cấu hình CORS cho bucket (Settings → CORS policy):

   ```json
   [
     {
       "AllowedOrigins": ["https://<tên-app>.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **Vercel**: import repo, thêm biến môi trường `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `APP_TIMEZONE=Asia/Ho_Chi_Minh`, `CRON_SECRET` (chuỗi ngẫu nhiên ≥ 16 ký tự).
   Lệnh build mặc định `npm run build` sẽ chạy migration rồi `next build`. Cron dọn dẹp hằng ngày khai báo trong `vercel.json`.
   Thêm `SMTP_USER` + `SMTP_PASS` (Gmail + Mật khẩu ứng dụng) để gửi mã xác thực — thiếu thì đăng ký bằng tên đăng nhập,
   thêm email và quên mật khẩu báo "chưa dùng được" ([`docs/DEPLOY.md`](docs/DEPLOY.md) mục 3.2). Tuỳ chọn:
   `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` cho đăng nhập Google (mục 3.1).
4. Mở `https://<tên-app>.vercel.app` trên điện thoại — HTTPS có sẵn nên camera dùng được.

Chạy local với Neon/R2 thật: `cp .env.example .env.local`, điền giá trị (nên dùng một Neon branch `dev`), rồi
`npm run db:migrate && npm run dev`.

## Sao lưu & khôi phục

Cần Postgres client tools (`pg_dump`, `pg_restore`) cùng major version với Neon.

```bash
npm run backup                                   # → backups/memorysave-<thời-gian>/{db.dump, photos/, manifest.json}
RESTORE_DATABASE_URL=<database-trống> RESTORE_R2_BUCKET=<bucket> npm run restore -- backups/memorysave-<thời-gian>
```

Khôi phục chỉ chạy vào database **trống** và không đụng dữ liệu đang dùng. Kiểm tra xong thì đổi
`DATABASE_URL`/`R2_BUCKET` trên Vercel sang bản khôi phục và redeploy.

## Quyền riêng tư (tóm tắt)

- Tên đăng nhập và email chỉ chủ tài khoản thấy; email chỉ được lưu sau khi xác thực bằng mã, và đăng nhập Google chỉ
  vào tài khoản có cùng email đã xác thực. Kết bạn bằng mã định danh công khai (vd `an.nguyen.4821`)
  hoặc link kết bạn (đổi link bất kỳ lúc nào để vô hiệu link cũ).
- Bài mới mặc định "Chỉ mình tôi"; chỉ chia sẻ được cho bạn bè; hủy kết bạn thu hồi quyền xem hai chiều.
- Mọi lần xem bài/ảnh đều kiểm tra quyền ở server; không có quyền → 404.
- Ảnh nằm trong bucket private, chỉ xem qua link ký hạn 60 giây; bản hiển thị đã xóa EXIF (gồm vị trí GPS).
