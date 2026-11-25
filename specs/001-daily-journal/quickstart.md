# Quickstart & Validation: MemorySave (001-daily-journal)

Hướng dẫn chạy, triển khai và kịch bản kiểm chứng. API: [contracts/api.md](./contracts/api.md);
dữ liệu: [data-model.md](./data-model.md); lý do chọn nền tảng: [research.md](./research.md) R2.

## Yêu cầu

- Node.js ≥ 22 (đã kiểm tra trên 24), npm, git
- Tài khoản miễn phí: **Vercel**, **Neon**, **Cloudflare** (R2 cần thêm phương thức thanh toán để kích hoạt;
  không bị tính phí trong hạn mức free)
- Để sao lưu: Postgres client tools (`pg_dump`, `pg_restore`) cùng major version với Neon

## 1. Chuẩn bị dịch vụ (một lần)

1. **Neon**: tạo project `memorysave` (region gần Việt Nam, ví dụ Singapore). Tạo thêm branch `dev` cho máy
   local. Lấy connection string (pooled) của từng branch.
2. **Cloudflare R2**: tạo bucket `memorysave-photos` (**không** bật public access). Tạo API token R2 quyền
   Object Read & Write cho bucket này → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`; ghi `R2_ACCOUNT_ID`.
   Cấu hình CORS cho bucket: cho phép `PUT`, `GET` từ `http://localhost:3000` và domain Vercel của app, header
   `Content-Type`.
3. **Vercel**: import repo GitHub, framework Next.js. Thêm Neon integration (tự đặt `DATABASE_URL`) hoặc dán
   tay. Thêm các biến `R2_*`, `APP_TIMEZONE=Asia/Ho_Chi_Minh`, `CRON_SECRET` (chuỗi ngẫu nhiên dài).

## 2. Chạy local

Nhanh nhất, không cần tài khoản: `npm install && npm run dev:local` (Postgres nhúng + ảnh trong `.data/`).

Với Neon/R2 thật:

```bash
npm install
cp .env.example .env.local     # DATABASE_URL = branch dev của Neon (hoặc Postgres local), R2_* dùng chung bucket hoặc bucket dev
npm run db:migrate
npm run dev                    # http://localhost:3000 (localhost được phép dùng camera)
```

## 3. Triển khai

```bash
git push                       # Vercel tự build: db:migrate → next build → deploy
```

Mở `https://<tên-app>.vercel.app` trên điện thoại — có HTTPS nên camera dùng được ngay.
Cron dọn dẹp khai báo trong `vercel.json`, chạy mỗi ngày một lần.

## 4. Kiểm thử tự động

```bash
npm test                       # Vitest: unit + integration trên PGlite + kho ảnh giả; không cần mạng
```

Kỳ vọng: tất cả xanh, gồm nhóm `access-denied` chứng minh SC-006 (khách, người không được chọn, người bị
bỏ khỏi người xem, người đã hủy kết bạn đều nhận 404 cho bài **và** cho API ảnh).

## 5. Kịch bản kiểm chứng thủ công (trên bản Vercel)

Chuẩn bị: 3 trình duyệt/hồ sơ riêng cho `an_nguyen`, `minh_tran`, `lan_do`.

1. **US1 – Nhật ký** (an): đăng ký → vào `/` (camera). Mở Viết, ngày giờ điền sẵn là hiện tại (giờ Việt Nam).
   Tạo 3 bài: hôm nay 12:10 (chỉ chữ), hôm qua 21:10 (2 ảnh, thấy tiến trình tải), tuần trước. `/journal`
   đúng nhóm ngày, mới nhất trước. Ngày giờ tương lai → báo lỗi. File `.pdf` đổi đuôi `.jpg` → bị từ chối.
   Ảnh 12 MB → bị từ chối kèm giới hạn. Sửa giờ một bài → vị trí cập nhật. Xóa một bài (có xác nhận).
2. **US2 – Đăng nhanh** (an, trên điện thoại): `/` → cho phép camera → đổi camera trước/sau → chụp → chú thích
   → "Chỉ mình tôi" → Đăng. Bài đứng đầu `/journal`, giờ = lúc chụp, ảnh đúng chiều. Từ chối quyền camera →
   có nút chọn/chụp ảnh qua trình chọn của thiết bị.
3. **US3 – Kết bạn**: an mời `minh_tran`; minh Đồng ý; cả hai thấy nhau. an mời `lan_do`, lan mời lại an →
   thành bạn ngay. Mời `khong_ton_tai` hoặc chính mình → báo lỗi.
4. **US4 – Chia sẻ**: an đăng bài chỉ chọn minh → minh thấy trong `/moments`, xem được ảnh, không có nút
   sửa/xóa; lan không thấy; lan dán URL bài và URL `/api/photos/<id>/display` → 404. an bỏ minh khỏi người
   xem → minh tải lại → bài biến mất, URL ảnh → 404. an đăng "Tất cả bạn bè" → minh, lan đều thấy. an hủy
   kết bạn với lan → lan mất mọi bài của an; kết bạn lại → bài cũ không tự hiện lại (FR-028).
5. **Riêng tư ảnh**: mở thẳng URL R2 của bucket (không ký) → bị từ chối. Sao chép link ký sau redirect, đợi
   hơn 60 giây rồi mở lại → hết hạn.
6. **Giao diện**: ở 360px không cuộn ngang; khớp thiết kế https://claude.ai/artifact/R54gKMFCQv1fsT3R8xAz9o.

## 6. Sao lưu & khôi phục (SC-007)

```bash
npm run backup                                 # → backups/memorysave-YYYYMMDD-HHmmss/{db.dump, photos/}
# khôi phục vào một Neon branch mới + bucket chỉ định, không đụng dữ liệu đang chạy:
RESTORE_DATABASE_URL=<branch-mới> RESTORE_R2_BUCKET=<bucket> npm run restore -- backups/memorysave-...
```

Kỳ vọng: số bài, ảnh, bạn bè, quyền xem trên branch mới khớp bản sao lưu (script in ra so sánh). Khi đã
kiểm tra, đổi `DATABASE_URL`/`R2_BUCKET` trên Vercel sang bản khôi phục và redeploy.
