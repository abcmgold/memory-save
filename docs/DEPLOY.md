# Đưa MemorySave lên production (miễn phí)

**Vercel** (chạy app) + **Neon** (PostgreSQL) + **Cloudflare R2** (ảnh). Mất khoảng 30–45 phút cho lần đầu.
Hạn mức free có thể thay đổi — kiểm tra lại trên trang của từng dịch vụ.

```
Điện thoại ──HTTPS──▶ Vercel (Next.js, vùng sin1) ──▶ Neon Postgres (Singapore)
     │                         │
     └──── PUT ảnh trực tiếp ──┴──▶ Cloudflare R2 (bucket private, link ký 60 giây)
```

---

## 0. Đẩy code lên GitHub

```bash
git add -A
git commit -m "MemorySave v1"
# tạo repo trống (private) trên github.com, rồi:
git remote add origin https://github.com/<bạn>/memorysave.git
git push -u origin master
```

Kiểm tra trước khi push: `.env.local`, `.data/`, `backups/` **không** nằm trong commit (đã có trong `.gitignore`).

---

## 1. Neon — cơ sở dữ liệu

1. Đăng ký tại neon.tech → **Create project**
   - Name: `memorysave` · Postgres version: mặc định · **Region: AWS Asia Pacific (Singapore)**
2. Vào **Connection Details** → chọn **Pooled connection** → sao chép chuỗi kết nối
   (dạng `postgres://…-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`). Đây là `DATABASE_URL`.
3. (Nên làm) Tạo thêm branch `dev` để chạy local với Neon thật mà không đụng dữ liệu production.

> Không cần tạo bảng thủ công — mỗi lần deploy, bước build tự chạy migration (`npm run db:migrate`).

---
## 2. Cloudflare R2 — kho ảnh

1. Đăng ký dash.cloudflare.com → **R2 Object Storage** → kích hoạt (cần thêm phương thức thanh toán; trong hạn
   mức free 10 GB không bị trừ tiền).
2. **Create bucket**: tên `memorysave-photos`, Location: *Automatic* hoặc gợi ý *Asia-Pacific*.
   **Không** bật *Public access* / *r2.dev subdomain* / custom domain — bucket phải private.
3. **Account ID** → `R2_ACCOUNT_ID`. Một trong các cách sau:
   - Nhìn thanh địa chỉ khi đang ở trang R2: `https://dash.cloudflare.com/`**`<ACCOUNT_ID>`**`/r2/...` — chuỗi 32 ký tự
     ngay sau `dash.cloudflare.com/`.
   - Bấm **Search** (hoặc `Ctrl + K`) ở bất kỳ trang nào → gõ `Copy account ID` → chọn kết quả để sao chép.
   - Vào **Workers & Pages** → mục **Account Details** → nút sao chép cạnh **Account ID**.
   aa06f8dfa09693e4e7489a40a64968fc
4. Tạo API token: trang **R2 object storage** (Overview) → mục **Account Details** → bấm **Manage** cạnh
   **API Tokens** → **Create Account API token**
   - Permissions: **Object Read & Write**
   - Phạm vi bucket: chọn chỉ áp dụng cho `memorysave-photos`
   - Bấm **Create Account API token** → sao chép ngay **Access Key ID** → `R2_ACCESS_KEY_ID` và
     **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (secret chỉ hiện **một lần**).
   - Trang này có thể hiện thêm "Token value" và đường dẫn endpoint — app không cần token value.
5. CORS: trang **R2 object storage** → bấm vào bucket `memorysave-photos` → tab **Settings** → mục **CORS Policy**
   → **Add CORS policy** → chọn tab **JSON** → dán nội dung dưới đây → **Save**
   (sửa tên miền cho đúng sau khi có ở bước 3 của Vercel; chỉ ghi `https://ten-mien`, không có `/` ở cuối):

```json
[
  {
    "AllowedOrigins": ["https://memorysave.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 3. Vercel — chạy ứng dụng

1. Đăng ký vercel.com bằng GitHub → **Add New → Project** → chọn repo `memorysave`.
2. Framework: Next.js (tự nhận). Build command để mặc định (`npm run build` = migrate + build).
3. **Environment Variables** (chọn môi trường **Production**):

| Tên | Giá trị |
|---|---|
| `DATABASE_URL` | chuỗi pooled của Neon (branch `main`) |
| `R2_ACCOUNT_ID` | từ bước 2.3 |
| `R2_ACCESS_KEY_ID` | từ bước 2.4 |
| `R2_SECRET_ACCESS_KEY` | từ bước 2.4 |
| `R2_BUCKET` | `memorysave-photos` |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` |
| `CRON_SECRET` | chuỗi ngẫu nhiên dài, tạo bằng lệnh bên dưới |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> ⚠️ **Preview deployments**: mỗi lần push lên nhánh khác `master`, Vercel build bản preview và cũng chạy
> migration. Đừng để preview dùng `DATABASE_URL` của production. Cách đơn giản: cài **Neon integration** trên
> Vercel (tự tạo branch Neon riêng cho mỗi preview), hoặc đặt `DATABASE_URL` của môi trường *Preview* trỏ tới branch
> `dev`. Nếu không dùng preview, có thể tắt ở Settings → Git.

4. **Deploy**. Xong sẽ có tên miền dạng `https://memorysave-xxxx.vercel.app` (đổi được ở Settings → Domains).
5. Quay lại **CORS của R2** (bước 2.5) sửa `AllowedOrigins` đúng tên miền này. Thiếu bước này → tải ảnh báo lỗi.

Cron dọn dẹp (`vercel.json`) tự đăng ký: chạy 03:00 giờ Việt Nam mỗi ngày.

---

## 4. Kiểm tra sau khi deploy

Mở tên miền trên **điện thoại** (có HTTPS nên camera dùng được):

- [ ] Đăng ký 2 tài khoản (2 trình duyệt hoặc 1 cửa sổ ẩn danh)
- [ ] Viết bài kèm ảnh từ thư viện — thấy tiến trình tải, ảnh hiện đúng chiều
- [ ] Đăng nhanh bằng camera, đổi camera trước/sau
- [ ] Trang Bạn bè → sao chép link kết bạn → mở ở tài khoản kia → tự thành bạn
- [ ] Đăng bài "Tất cả bạn bè" → tài khoản kia thấy trong tab Khoảnh khắc
- [ ] Vercel → Settings → **Cron Jobs** → bấm **Run** cho `/api/cron/cleanup` → trả về 200
- [ ] Mở thẳng một URL ảnh `https://<account>.r2.cloudflarestorage.com/memorysave-photos/...` → bị từ chối (bucket private)

---

## 5. Cập nhật về sau

```bash
git push        # Vercel tự build: chạy migration mới (nếu có) rồi deploy
```

Migration chỉ thêm, không xóa dữ liệu (constitution V). Muốn quay lại bản cũ: Vercel → Deployments → bản trước →
**Promote to Production** (lưu ý: database không tự quay lại).

---

## 6. Sao lưu

Chạy trên máy bạn (cần `pg_dump`/`pg_restore` cùng major version với Neon) với `.env.local` trỏ vào production:

```bash
npm run backup     # → backups/memorysave-<thời-gian>/
```

Nên làm định kỳ (ví dụ mỗi tuần) và trước mỗi thay đổi lớn. Khôi phục: xem README › Sao lưu & khôi phục.

---

## 7. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Build lỗi `DATABASE_URL is not set` | Chưa thêm biến môi trường cho đúng môi trường (Production/Preview) |
| Trang báo lỗi 500, log có `Invalid environment configuration` | Thiếu/sai biến R2 hoặc `CRON_SECRET` (< 16 ký tự) |
| Chọn ảnh xong báo lỗi mạng, console có `CORS` | `AllowedOrigins` của R2 chưa có tên miền Vercel (đúng cả `https://`, không có `/` cuối) |
| Ảnh tải lên được nhưng không hiện | Sai `R2_BUCKET` hoặc token không có quyền Read |
| Lần mở đầu tiên chậm vài giây | Neon free tự ngủ khi rảnh — bình thường |
| Camera không mở | Phải mở qua `https://` (tên miền Vercel), không phải `http://IP` |
| Cron trả 401 | `CRON_SECRET` trên Vercel khác với lúc deploy — đặt lại rồi redeploy |

## Hạn mức free cần để ý

- **Neon**: dung lượng DB nhỏ (~0,5 GB) — đủ cho hàng trăm nghìn bài chữ; ảnh không nằm ở đây.
- **R2**: 10 GB ảnh (mỗi ảnh lưu bản gốc + bản hiển thị + thumbnail ≈ 1,3× dung lượng gốc).
- **Vercel Hobby**: chỉ dùng cá nhân/phi thương mại; cron tối đa 1 lần/ngày.
