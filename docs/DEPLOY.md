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

### 3.1 Đăng nhập bằng Google (tùy chọn)

Bỏ qua mục này thì app chạy bình thường, chỉ không có nút "Tiếp tục với Google".

1. Vào console.cloud.google.com → tạo project (vd `memorysave`).
2. **APIs & Services → OAuth consent screen**: chọn External, tên ứng dụng "MemorySave", thêm scope `openid`,
   `email`, `profile`. Khi còn ở chế độ *Testing*, chỉ email có trong **Test users** đăng nhập được — thêm email
   người dùng thử, hoặc bấm **Publish app** khi sẵn sàng.
3. **Credentials → Create credentials → OAuth client ID** → loại **Web application**. Ở **Authorized redirect URIs**
   thêm đúng:
   - `https://<tên-miền-vercel>/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (để chạy local)
4. Thêm biến môi trường trên Vercel (và vào `.env.local` khi chạy local), rồi **Redeploy**:

| Tên | Giá trị |
|---|---|
| `GOOGLE_CLIENT_ID` | `....apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | client secret vừa tạo |

> Redirect URI lấy theo tên miền đang mở app. Bản **preview** của Vercel có tên miền khác, nên đăng nhập Google ở
> preview sẽ báo `redirect_uri_mismatch` trừ khi bạn thêm URI của preview đó vào bước 3.

### 3.2 Gửi mã xác thực qua Gmail (cần cho đăng ký, thêm email, quên mật khẩu)

Thiếu mục này thì đăng nhập vẫn chạy, nhưng **đăng ký bằng tên đăng nhập, thêm/đổi email và quên mật khẩu** báo
"Tính năng gửi mã tạm thời chưa dùng được". Làm xong mục này **trước** khi deploy bản có 005.

1. Dùng một tài khoản Gmail (nên tạo riêng, vd `memorysave.app@gmail.com`). Bật **Xác minh 2 bước** ở
   myaccount.google.com → Bảo mật.
2. Vào myaccount.google.com/apppasswords → tạo **Mật khẩu ứng dụng** tên "MemorySave" → chép chuỗi 16 ký tự.
3. Thêm biến môi trường trên Vercel rồi **Redeploy**:

| Tên | Giá trị |
|---|---|
| `SMTP_USER` | địa chỉ Gmail ở bước 1 |
| `SMTP_PASS` | mật khẩu ứng dụng 16 ký tự (có hay không có dấu cách đều được) |
| `MAIL_FROM_NAME` | (tuỳ chọn) tên người gửi, mặc định `MemorySave` |

> Gmail cho gửi khoảng 500 thư/ngày — thừa cho app gia đình. Thư đầu tiên có thể vào **Spam/Quảng cáo**: mở thư, bấm
> "Không phải thư rác" để các thư sau vào hộp chính. Đổi mật khẩu Gmail sẽ làm mật khẩu ứng dụng mất hiệu lực — tạo lại
> và cập nhật `SMTP_PASS`.

---

## 4. Kiểm tra sau khi deploy

Mở tên miền trên **điện thoại** (có HTTPS nên camera dùng được):

- [ ] Đăng ký 2 tài khoản (2 trình duyệt hoặc 1 cửa sổ ẩn danh) — mỗi lần nhận thư có mã 6 số, nhập mã → vào app
- [ ] (Nếu bật Google) Bấm "Tiếp tục với Google" → xác nhận tên hiển thị → vào trang chính
- [ ] (Nếu bật Google) Đăng xuất tài khoản có email Gmail đã xác thực → "Tiếp tục với Google" bằng Gmail đó → vào đúng
  tài khoản cũ, không hỏi tên
- [ ] Trang đăng nhập → "Quên mật khẩu?" → nhận mã → đặt mật khẩu mới → thiết bị khác bị đăng xuất
- [ ] Tài khoản cũ chưa có email → tab Cá nhân có cảnh báo vàng → thêm email → cảnh báo biến mất
- [ ] Vercel → Logs: không có mã 6 số hay email nào bị ghi ra
- [ ] Viết bài kèm ảnh từ thư viện — thấy tiến trình tải, ảnh hiện đúng chiều
- [ ] Đăng nhanh bằng camera, đổi camera trước/sau
- [ ] Tab Cá nhân → sao chép link kết bạn → mở ở tài khoản kia → tự thành bạn
- [ ] Đăng bài "Tất cả bạn bè" → tài khoản kia thấy trong tab Khoảnh khắc
- [ ] Vercel → Settings → **Cron Jobs** → bấm **Run** cho `/api/cron/cleanup` → trả về 200
- [ ] Cửa sổ ẩn danh mở `https://<tên-miền>/` → trang giới thiệu; đã đăng nhập mở `/` → vào thẳng `/camera`
- [ ] https://pagespeed.web.dev cho `/` → SEO 100, Accessibility ≥ 95; https://search.google.com/test/rich-results cho
  `/` → nhận diện `WebApplication`; Google Search Console → gửi `https://<tên-miền>/sitemap.xml`
- [ ] Cửa sổ ẩn danh mở `https://<tên-miền>/me` → chuyển ngay sang `/login?next=%2Fme` (mã 307, không chớp trang trống)
- [ ] `https://<tên-miền>/robots.txt` và `/manifest.webmanifest` mở được
- [ ] Dán link kết bạn vào https://developers.facebook.com/tools/debug (hoặc gửi thử qua Zalo/Messenger) → thẻ xem trước
  có "<tên> mời bạn kết bạn trên MemorySave" và ảnh. Facebook/Zalo lưu tạm thẻ cũ: bấm **Scrape Again** nếu vừa deploy
- [ ] Điện thoại: "Thêm vào màn hình chính" → icon cuốn sổ nền cam, tên MemorySave
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
| Đăng ký báo "Tính năng gửi mã tạm thời chưa dùng được" | Thiếu `SMTP_USER`/`SMTP_PASS` (mục 3.2) — thêm rồi **Redeploy** |
| Báo "Chưa gửi được mã", log có `[mail] send failed: code=EAUTH` | Sai `SMTP_PASS`, hoặc đã đổi mật khẩu Gmail làm Mật khẩu ứng dụng mất hiệu lực — tạo mới |
| Trang Mật khẩu ứng dụng báo "Cài đặt … không khả dụng" | Chưa bật Xác minh 2 bước, mở nhầm tài khoản (xem `/u/<số>/` trên URL), tài khoản Workspace bị admin chặn, hoặc đang bật Bảo vệ nâng cao — dùng một Gmail cá nhân riêng |
| Không thấy thư có mã | Xem thư mục Spam/Quảng cáo; mỗi email tối đa 5 mã/giờ |

## Hạn mức free cần để ý

- **Neon**: dung lượng DB nhỏ (~0,5 GB) — đủ cho hàng trăm nghìn bài chữ; ảnh không nằm ở đây.
- **R2**: 10 GB ảnh (mỗi ảnh lưu bản gốc + bản hiển thị + thumbnail ≈ 1,3× dung lượng gốc).
- **Vercel Hobby**: chỉ dùng cá nhân/phi thương mại; cron tối đa 1 lần/ngày.
- **Gmail SMTP**: khoảng 500 thư/ngày cho một tài khoản Gmail thường.
