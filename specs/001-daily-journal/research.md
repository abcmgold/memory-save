# Research: MemorySave (001-daily-journal)

Mỗi mục: **Decision** / **Rationale** / **Alternatives considered**.
Rev 2 (2026-11-25): chuyển sang PostgreSQL và triển khai miễn phí trên Vercel + Neon + Cloudflare R2.

## R1. Khung ứng dụng

- **Decision**: Một project Next.js (App Router, TypeScript strict), bản ổn định mới nhất tại thời điểm
  cài đặt. Trang đọc dữ liệu bằng Server Components gọi thẳng tầng service; mọi thao tác ghi và mọi đọc
  phía client đi qua Route Handlers JSON dưới `/api`.
- **Rationale**: Người dùng chọn Next.js; một codebase cho UI + API, triển khai tự nhiên trên Vercel.
  Route Handlers cho một bề mặt hợp đồng duy nhất, test được bằng `Request` thuần.
- **Alternatives**: Server Actions cho form — khó viết contract test, giới hạn body; backend tách riêng —
  hai thứ phải triển khai, trái Nguyên tắc I.

## R2. Nền tảng triển khai (miễn phí)

- **Decision**: **Vercel Hobby** chạy app; **Neon Free** cho PostgreSQL; **Cloudflare R2** (bucket
  private) cho ảnh. Biến môi trường cấu hình trên Vercel; Neon nối với Vercel qua integration (tạo
  `DATABASE_URL`).
- **Rationale**: Vercel là nền tảng gốc của Next.js, có HTTPS sẵn (camera chạy được trên điện thoại).
  Neon là Postgres serverless có gói free và driver dùng được trong môi trường serverless. R2 có hạn mức
  free lớn nhất (10 GB lưu trữ, không tính phí băng thông ra), tương thích S3 (presigned URL).
  Hạn mức free có thể thay đổi — kiểm tra lại khi đăng ký.
- **Hạn chế đã biết & cách xử lý**:
  - Vercel Hobby chỉ cho dùng cá nhân, phi thương mại — phù hợp.
  - Body request tới function tối đa 4,5 MB → ảnh được tải thẳng lên R2 (R6).
  - Cron trên Hobby chỉ chạy mỗi ngày một lần → dọn ảnh pending hằng ngày (đủ dùng).
  - Neon tự ngủ khi không có truy vấn → lần mở đầu tiên chậm vài giây (đã ghi trong spec Assumptions).
  - R2 yêu cầu thêm phương thức thanh toán để kích hoạt, không tính phí trong hạn mức free.
- **Alternatives**: Supabase (DB 500 MB + Storage 1 GB, không cần thẻ) — kho ảnh nhỏ, project tự tạm dừng
  sau 1 tuần không dùng; Render free — ngủ sau 15 phút, khởi động chậm; Vercel Blob — hạn mức free nhỏ.

## R3. Cơ sở dữ liệu & ORM

- **Decision**: PostgreSQL qua Drizzle ORM; migration sinh bằng `drizzle-kit`, commit vào repo, chạy bằng
  `npm run db:migrate` (bước build trên Vercel chạy migrate trước `next build`). Driver theo môi trường:
  - Production/dev: `@neondatabase/serverless` (Pool qua WebSocket) + `drizzle-orm/neon-serverless` — hỗ trợ
    transaction tương tác (cần cho hủy kết bạn, lưu bài + ảnh + audience).
  - Test: **PGlite** (Postgres chạy trong tiến trình Node bằng WASM) + `drizzle-orm/pglite`, chạy migration
    thật — không cần cài Postgres hay Docker.
  - Dev local có thể dùng một **Neon branch** riêng (`dev`) hoặc Postgres local qua `DATABASE_URL`.
- **Rationale**: Người dùng chọn Postgres. Drizzle nhẹ, schema bằng TypeScript, hỗ trợ cả hai driver với
  cùng schema. PGlite giữ `npm test` chạy được bằng một lệnh (Nguyên tắc III).
- **Alternatives**: Prisma — engine riêng, cold start nặng hơn trên serverless; `pg` thuần qua TCP — kém
  phù hợp serverless (cạn kết nối) khi không dùng pooler.

## R4. Xác thực & phiên

- **Decision**: Tự cài phiên: token ngẫu nhiên 32 byte trong cookie `ms_session` (HttpOnly, Secure,
  SameSite=Lax, Path=/; bỏ Secure chỉ khi chạy `http://localhost`); DB lưu SHA-256 của token; hạn 30 ngày,
  gia hạn trượt khi còn < 15 ngày. Mật khẩu: Argon2id qua `@node-rs/argon2` (prebuilt, chạy được trên
  Vercel). Chặn đăng nhập sau 5 lần sai/15 phút theo username (bảng `login_attempts`). Mutation kiểm tra
  `Origin` trùng host (chống CSRF).
- **Rationale**: Chỉ cần username/password; lưu băm token để lộ DB không lộ phiên; thu hồi phiên tức thì.
- **Alternatives**: Auth.js Credentials — cấu hình phức tạp, JWT khó thu hồi; bcrypt — giới hạn 72 byte.

## R5. Lưu trữ & phục vụ ảnh

- **Decision**: Bucket R2 **private** (không bật public access, không gắn custom domain công khai). Key do
  hệ thống đặt: `photos/<photoId>/original`, `photos/<photoId>/display.webp` (cạnh dài ≤ 2048),
  `photos/<photoId>/thumb.webp` (cạnh dài ≤ 480); `photoId` là UUIDv4.
  Xem ảnh: `GET /api/photos/:id/:variant` kiểm tra quyền giống bài chứa ảnh (không có quyền → 404); có
  quyền → `302` tới **presigned GET URL hạn 60 giây**, response kèm `Cache-Control: private, no-store`.
  Không dùng `next/image` cho ảnh riêng tư (tránh cache tối ưu ảnh dùng chung).
- **Rationale**: Nguyên tắc IV — không có đường dẫn công khai, mọi lần xem đều qua kiểm tra quyền. Redirect
  thay vì proxy byte qua function để không tốn băng thông/thời gian chạy Vercel và tránh giới hạn 4,5 MB
  phía response streaming. Link ký chỉ sống 60 giây nên bị lộ cũng nhanh hết hạn; thu hồi quyền có hiệu
  lực ở lần gọi API tiếp theo (FR-032).
- **Alternatives**: Proxy toàn bộ byte qua function — chặt hơn nhưng chậm, tốn hạn mức; bucket public với
  key khó đoán — trái Nguyên tắc IV.

## R6. Luồng upload (trực tiếp lên R2)

- **Decision**: Ba bước, mỗi ảnh một luồng:
  1. `POST /api/photos` `{ contentType, size }` → server kiểm `size ≤ 10 MB`, `contentType` thuộc danh sách
     cho phép, số ảnh pending của user ≤ 30; tạo hàng `photos` trạng thái `uploading`; trả presigned PUT URL
     (hạn 10 phút) có ký kèm `Content-Length` và `Content-Type` → R2 từ chối nếu client gửi khác.
  2. Client `PUT` file thẳng lên R2 bằng `XMLHttpRequest` (hiện tiến trình), tối đa 3 ảnh song song.
  3. `POST /api/photos/:id/complete` → server `HEAD` để xác nhận kích thước, tải object về, kiểm tra định
     dạng **theo nội dung** bằng sharp (R7), tạo `display`/`thumb`, ghi lên R2, chuyển trạng thái `pending`.
     Sai định dạng → xóa object, trả 415.
  Sau đó tạo/sửa bài với `photoIds` (chỉ ảnh `pending` của chính người đó). Ảnh `uploading`/`pending` quá
  24 giờ bị dọn bởi Vercel Cron hằng ngày (`/api/cron/cleanup`, bảo vệ bằng `CRON_SECRET`).
  Bucket R2 cấu hình CORS cho phép `PUT` từ origin của app.
- **Rationale**: Vượt giới hạn 4,5 MB của Vercel; lỗi mạng chỉ phải thử lại một ảnh; bài không bao giờ
  được tạo với ảnh chưa kiểm tra.
- **Alternatives**: Upload qua function — bị chặn ở 4,5 MB; presigned POST policy giới hạn kích thước — R2
  không hỗ trợ POST policy.

## R7. Kiểm tra & xử lý ảnh

- **Decision**: `sharp` trong Route Handler (Node runtime). `metadata()` xác định định dạng thật
  (jpeg/png/webp/heif); khác → từ chối. `.rotate()` sửa chiều theo EXIF; bản `display`/`thumb` không giữ
  metadata (xóa GPS). HEIC/HEIF: bản prebuilt của sharp không giải mã HEVC → chuyển sang JPEG bằng
  `heic-convert` (thuần JS/WASM) rồi mới đưa vào sharp; bản gốc vẫn giữ. Phía client, ảnh chụp từ camera
  trong app đã là JPEG; iOS thường tự chuyển HEIC → JPEG khi chọn qua `<input>`.
- **Rationale**: FR-014 (kiểm theo nội dung), bảo vệ vị trí khi chia sẻ.
- **Alternatives**: Biên dịch libvips + libheif — không làm được trên Vercel; chặn HEIC — trái FR-014.

## R8. Ngày giờ & múi giờ

- **Decision**: Cột `event_at timestamp without time zone` = giờ địa phương người viết chọn (không quy đổi);
  cột sinh `event_date date` để nhóm ngày. Múi giờ ứng dụng `APP_TIMEZONE` (mặc định `Asia/Ho_Chi_Minh`)
  — server Vercel chạy UTC nên "bây giờ" và kiểm tra "không ở tương lai" luôn tính theo `APP_TIMEZONE`,
  cho phép lệch 1 phút. Thứ tự: `event_at DESC, created_at DESC, id DESC`. Hiển thị bằng
  `Intl.DateTimeFormat('vi-VN')`.
- **Rationale**: Spec yêu cầu hiển thị đúng giờ đã chọn; tránh lệch ngày do server chạy UTC.
- **Alternatives**: `timestamptz` — phải biết múi giờ từng người viết, spec chưa cần.

## R9. Phân trang

- **Decision**: Keyset cursor base64url từ `(event_at, created_at, id)`, 20 bài/trang; nhảy tới ngày =
  điều kiện `event_at < (<ngày> + 1 day)`. Client dùng IntersectionObserver để tải tiếp.
- **Rationale**: Ổn định khi có bài mới; nhanh với chỉ mục phù hợp (SC-005).
- **Alternatives**: OFFSET — trùng/lệch bài khi dữ liệu thay đổi.

## R10. Mô hình bạn bè & quyền xem

- **Decision**: `friendships` một hàng mỗi cặp với `user_a_id < user_b_id`; `friend_requests (from, to)`
  duy nhất. Quyền xem là bảng `entry_audience (entry_id, user_id)`; "Tất cả bạn bè" được mở rộng thành
  từng hàng tại lúc lưu (FR-028); bài lưu `audience_mode` để hiển thị. Hủy kết bạn: một transaction xóa
  friendship + mọi `entry_audience` giữa hai người theo cả hai chiều (FR-032). Kiểm tra xem = chủ bài
  **hoặc** (có hàng audience **và** còn là bạn). Lựa chọn gần nhất lưu ở `users.last_audience` (jsonb).
- **Rationale**: Bảng "Bạn bè" chỉ là join theo `user_id`; thu hồi là xóa hàng.
- **Alternatives**: Tính "tất cả bạn bè" động lúc đọc — bạn mới thấy bài cũ, trái FR-028.

## R11. Giao diện

- **Decision**: Tailwind CSS v4 với token khớp bản thiết kế neo-brutalism (kem `#FBF6EC`, mực `#111111`,
  lavender `#C8B6FF`, cam đào `#FFB38A`, vàng `#FFE27A`, bạc hà `#B8F2C8`, xanh `#A8D8FF`, hồng `#FFB3D1`;
  viền 2px; bóng cứng `2px 2px 0 #111` và `3px 3px 0 #111`; nền chấm bằng `radial-gradient`). Font Be
  Vietnam Pro qua `next/font/google` (subset `vietnamese`, tự host khi build). Component tự viết: `Button`,
  `Card`, `Sticker`, `Field`, `Chip`, `Avatar`, `BottomNav`, `Sheet`. Mobile-first, khung tối đa 480px
  giữa màn hình trên desktop.
- **Rationale**: Khớp thiết kế đã duyệt; không cần UI kit.
- **Alternatives**: shadcn/ui — phải ghi đè gần hết style.

## R12. Camera đăng nhanh

- **Decision**: `getUserMedia({ video: { facingMode } })` vào `<video>`, đổi `user`/`environment`, chụp qua
  `<canvas>` → `toBlob('image/jpeg', 0.9)`; flash bằng `applyConstraints({ advanced: [{ torch: true }] })`
  khi thiết bị hỗ trợ (ẩn nút nếu không). Dự phòng (FR-021): `<input type="file" accept="image/*"
  capture="environment">`. Dừng mọi track khi rời trang.
- **Rationale**: API chuẩn; bản trên Vercel có HTTPS nên camera hoạt động trên điện thoại. Khi dev local,
  `localhost` cũng là secure context; thử trên điện thoại thì dùng bản preview của Vercel.
- **Alternatives**: Chỉ `<input capture>` — không có khung camera trong app như thiết kế.

## R13. Sao lưu & khôi phục

- **Decision**: `npm run backup` (chạy trên máy người vận hành) tạo `backups/memorysave-YYYYMMDD-HHmmss/`
  gồm `db.dump` từ `pg_dump --format=custom $DATABASE_URL` và thư mục `photos/` tải toàn bộ object từ R2
  (S3 API). `npm run restore -- <thư mục>` khôi phục vào một **Neon branch mới** (hoặc DB trống chỉ định
  bằng `RESTORE_DATABASE_URL`) bằng `pg_restore`, và tải ảnh lên bucket chỉ định — không ghi đè dữ liệu
  đang chạy; người vận hành đổi `DATABASE_URL` khi đã kiểm tra. Script so số ảnh trong DB với số object.
  Bổ sung: Neon có khôi phục theo thời điểm trong cửa sổ ngắn của gói free.
- **Rationale**: Nguyên tắc V, SC-007; restore không phá dữ liệu hiện tại.
- **Alternatives**: Chỉ dựa vào khôi phục của Neon — cửa sổ gói free ngắn, không bao gồm ảnh R2.
- **Yêu cầu**: máy chạy backup cần Postgres client tools (`pg_dump`, `pg_restore`) cùng major version với Neon.

## R14. Kiểm thử

- **Decision**: Vitest. Unit cho `src/server/domain/*`. Integration cho service + Route Handlers trên
  PGlite (migration thật) và **kho ảnh giả trong bộ nhớ** cài cùng interface `PhotoStore` với R2
  (`put/get/head/delete/presignPut/presignGet`). Bắt buộc bao phủ ca bị từ chối (khách, người không được
  chọn, người bị bỏ khỏi người xem, người đã hủy kết bạn, gọi trực tiếp API ảnh). `npm test` không cần
  mạng hay tài khoản đám mây.
- **Rationale**: Nguyên tắc III, SC-006.
- **Alternatives**: Test trên Neon/R2 thật — chậm, cần bí mật, không chạy offline; Playwright E2E — để sau.

## R15. Validate dữ liệu vào

- **Decision**: `zod` cho body/query; thông báo lỗi tiếng Việt tập trung ở `src/lib/messages.ts`.
- **Rationale**: Một nguồn sự thật cho giới hạn trong spec.
- **Alternatives**: Tự viết validator — dễ sai.

## R16. Cấu hình & bí mật

- **Decision**: Biến môi trường: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`, `APP_TIMEZONE`, `CRON_SECRET`. `.env.example` commit, `.env.local` không commit; trên Vercel
  đặt ở Project Settings. Đọc và kiểm tra bằng zod một lần khi khởi động (`src/server/env.ts`).
- **Rationale**: Ràng buộc kỹ thuật của constitution (không commit bí mật).

## Ghi chú khi triển khai (2026-11-25)

- **R1 bổ sung — Next.js 16.4, tắt Cache Components**: bản scaffold bật `cacheComponents`/`partialPrefetching`.
  Mọi trang của app đều riêng tư theo từng người nên đã tắt để giữ mô hình render động mỗi request (Nguyên tắc I).
- **R11 bổ sung — font tự host bằng `@fontsource/be-vietnam-pro`** thay vì `next/font/google`: build không phụ
  thuộc việc truy cập fonts.googleapis.com (môi trường dev bị chặn DNS) và không gọi CDN khi chạy.
- **R17 — Chế độ local (`npm run dev:local`)**: Postgres nhúng (PGlite qua `@electric-sql/pglite-socket`,
  cổng 5433) + kho ảnh trên đĩa, cả hai trong `~/.memorysave-local` — **ngoài** thư mục dự án vì Turbopack
  theo dõi mọi file trong project root (ghi DB vào trong project sẽ kích hoạt biên dịch lại liên tục khi dev) phục vụ qua `/api/local-storage` với URL
  ký HMAC có hạn — cùng hợp đồng như presigned URL của R2. Bật bằng `MS_LOCAL=1`; tự báo lỗi nếu chạy trên
  Vercel/production. DB client chọn driver theo host: `*.neon.tech` → Neon serverless, còn lại → node-postgres.
  Lý do: ràng buộc kỹ thuật "chạy local dễ dàng" và cho phép kiểm thử end-to-end trước khi có tài khoản đám mây.
- **R6 bổ sung**: trình duyệt không cho đặt header `Content-Length`; presigned PUT ký `content-length` nên trình
  duyệt tự gửi đúng kích thước file — client chỉ cần đặt `Content-Type`.

- **R5 sửa đổi (2026-11-25, người dùng chọn) — ảnh lưu đệm được 1 giờ**: DTO trả thẳng link R2 đã ký (chỉ tạo sau khi
  kiểm tra quyền xem bài), ký với `signingDate` = đầu giờ hiện tại nên link **giống hệt** trong cả giờ, hạn 1 giờ + 5
  phút; R2 trả `Cache-Control: private, max-age=3600`. F5/quay lại trang hiện ảnh ngay từ cache, bỏ chặng `/api/photos`
  (Vercel + Neon) cho mỗi ảnh. Đánh đổi: ảnh đã tải trên máy người bị thu hồi còn xem được ≤ 1 giờ; link lộ dùng được
  ≤ ~1 giờ 5 phút. `/api/photos/:id/:variant` vẫn kiểm quyền mỗi lần và trả `no-store`. Bucket private không đi qua CDN
  của Cloudflare (CDN chỉ áp dụng cho custom domain/public bucket).
