# Research: 005 Email xác thực bằng OTP

## R1. Gửi thư: nodemailer qua Gmail SMTP

- **Decision**:
  - Dùng `nodemailer@10.6.1` với `smtp.gmail.com:465` (TLS ngay từ đầu), đăng nhập bằng `SMTP_USER` (địa chỉ Gmail) và
    `SMTP_PASS` (App Password 16 ký tự; tài khoản Google cần bật xác minh 2 bước).
  - Người gửi: `"${MAIL_FROM_NAME ?? 'MemorySave'}" <SMTP_USER>`. Gmail sẽ ghi đè địa chỉ From nếu khác `SMTP_USER`,
    nên dùng đúng `SMTP_USER`.
  - Transporter được tạo một lần mỗi instance (lazy), không dùng `pool`: serverless không giữ kết nối lâu.
  - Mỗi thư gồm cả `text` và `html` đơn giản; tiêu đề có mã, ví dụ "123456 là mã MemorySave của bạn", để người dùng thấy
    mã ngay trên thông báo điện thoại.
- **Interface**:
  - `Mailer.send({ to, subject, text, html }): Promise<void>`.
  - `getMailer()` trả về:
    - `SmtpMailer` khi có cấu hình;
    - `LogMailer` khi đang chạy local (`MS_LOCAL=1`, trừ khi đặt `MAIL_TRANSPORT=smtp` để thử gửi thật) hoặc trong
      `NODE_ENV=test`. `LogMailer` ghi `[mail] to=… subject=…`
      kèm phần thân ra console, để nhà phát triển đọc mã;
    - `null` ở production khi thiếu cấu hình. Khi đó các route gửi mã trả 503 `MAIL_UNAVAILABLE` (FR-E16).
  - `setMailerForTests()` thay bằng `MemoryMailer`, để test đọc được thư và mã.
- **Rationale**: Người dùng chọn Gmail SMTP. Đây là thư viện SMTP phổ biến nhất cho Node, không có dependency con, và tự
  xử lý MIME UTF-8 cho tiếng Việt.
- **Alternatives**:
  - Tự viết SMTP: bị loại (xem Complexity Tracking).
  - Resend: cần tên miền riêng.
  - Gmail API: cần OAuth riêng và refresh token, phức tạp hơn.

## R2. Lưu mã: ticket + băm hai lớp

- **Decision**:
  - Mỗi lần "bắt đầu" (đăng ký, đổi email, quên mật khẩu) tạo:
    - một `ticket` ngẫu nhiên 32 byte (base64url), trả cho client trong JSON. Client giữ trong state của trang và gửi
      kèm khi nhập mã hoặc gửi lại;
    - một mã gồm 6 chữ số từ `crypto.randomInt(0, 1_000_000)`, đệm số 0 ở đầu.
  - DB lưu:
    - `ticket_hash = sha256(ticket)`, làm khoá chính;
    - `code_hash = sha256(ticket + ":" + code)`.
  - So sánh `code_hash` bằng `timingSafeEqual`.
- **Rationale**:
  - Mã 6 số băm trần thì dò ngược ngay được. Thêm ticket (chỉ trình duyệt biết, DB không lưu dạng thô) vào làm "muối
    bí mật", nên lộ DB trong 10 phút cũng không dùng được mã.
  - Ticket gắn mã với đúng trình duyệt đã yêu cầu: kẻ khác biết email nhưng không có ticket thì không nhập mã thay được.
- **Alternatives**:
  - Khoá theo (mục đích, email): kẻ xấu có thể ghi đè yêu cầu của người khác, và không gắn được với trình duyệt.
  - HMAC với bí mật cấu hình riêng: phải thêm biến môi trường mà không tăng an toàn bao nhiêu so với cách trên.

## R3. Đếm sai, hết hạn, gửi lại, giới hạn

- **Nhập sai**:
  - Tăng bộ đếm nguyên tử bằng
    `UPDATE email_codes SET attempts = attempts + 1 WHERE ticket_hash = $1 AND attempts < 5 AND expires_at > now() RETURNING …`,
    *trước* khi so sánh mã.
  - Không có dòng nào trả về nghĩa là mã đã hết hạn, đã bị huỷ hoặc không tồn tại.
  - Sai lần thứ 5 → dòng giữ `attempts = 5` (không dùng được nữa) → trả `410 GONE` ("Mã đã hết hiệu lực, hãy gửi mã
    mới"); "Gửi lại" trên cùng ticket sinh mã mới và đặt lại bộ đếm.
  - Bước tăng bộ đếm chạy **ngoài** transaction nghiệp vụ (tự commit) để lần sai không bị rollback; mã đúng được "nhận"
    trong transaction nghiệp vụ bằng `DELETE … WHERE ticket_hash RETURNING` nên chỉ dùng được một lần dù gửi đồng thời.
  - Sai lần 1–4 → trả `422 CODE_INVALID` kèm `attemptsLeft`.
- **Đúng mã**: xoá dòng trong cùng transaction với thao tác nghiệp vụ (tạo user, đổi mật khẩu, đổi email). Mã chỉ dùng
  được một lần.
- **Gửi lại**: `POST /api/auth/codes/resend {ticket}` sinh mã mới cho cùng ticket, đặt lại `attempts = 0`,
  `expires_at = now + 10 phút`, `sent_at = now`. Nếu chưa đủ 60 giây kể từ `sent_at` → 429 kèm `retryAfter` (giây).
  Mã cũ mất hiệu lực vì `code_hash` bị thay.
- **"Bắt đầu" lại** với cùng mục đích + email (và cùng `user_id` với đổi email): xoá các dòng cũ của bộ khoá đó trước khi
  tạo dòng mới.
- **Giới hạn**:
  - Trước mỗi lần gửi, đếm `email_sends` trong 1 giờ qua: theo `email` (≥ 5 thì chặn) và theo `ip` (≥ 20 thì chặn) → 429.
  - Mỗi lần gửi thành công (hoặc lần gửi được tính) thêm một dòng.
  - Gửi thất bại (SMTP lỗi) không thêm dòng `email_sends` và không đặt `sent_at`. Ở bước "bắt đầu", dòng mã cũng bị xoá
    → trả `502 MAIL_FAILED` (edge case "không tính vào thời gian chờ").
- **IP**: `clientIp(req)` lấy giá trị đầu của `x-forwarded-for` (Vercel ghi đè header này nên tin được), không có thì
  dùng `"unknown"`. Local cũng chung `"unknown"`, chấp nhận được.
- **Dọn dẹp**: cron hiện có xoá `email_codes` hết hạn và `email_sends` cũ hơn 1 giờ.

## R4. Không tiết lộ email đã có tài khoản (FR-E05)

- **Đăng ký / đổi email sang email đã thuộc tài khoản khác**: vẫn qua đủ các bước như bình thường (kiểm tra giới hạn, tạo
  ticket, ghi `email_sends`, gửi thư), chỉ khác hai điểm:
  - dòng mã có `code_hash` của một mã ngẫu nhiên **không gửi đi**, nên mọi mã nhập vào đều sai;
  - thư có nội dung "Email này đã có tài khoản MemorySave — hãy đăng nhập hoặc dùng Quên mật khẩu".

  Phản hồi HTTP và thời gian xử lý (đều có một lần gửi SMTP) giống hệt trường hợp email mới.
- **Quên mật khẩu**: luôn tạo ticket với dòng mã và trả `202` như nhau. Thư được gửi trong `after()` của `next/server`,
  nên thời gian phản hồi không phụ thuộc email có tài khoản hay không. Ba trường hợp:
  - tài khoản có mật khẩu → thư có mã thật;
  - tài khoản chỉ dùng Google → thư "Tài khoản này đăng nhập bằng Google", mã ngầm vô dụng;
  - không có tài khoản → không gửi thư, mã ngầm vô dụng.

  Đánh đổi: lỗi SMTP ở luồng này không báo được cho người dùng (chỉ ghi log). Chấp nhận được, vì người dùng có thể bấm gửi
  lại. Chặn theo giới hạn vẫn báo `429` đồng bộ, và áp dụng cho mọi email nên không tiết lộ gì.
- **Rationale**: Ngăn dò danh sách người dùng mà vẫn giúp được chủ thật của email.
- **Alternatives**: Báo thẳng "email đã được dùng" thì đơn giản hơn nhưng lộ thông tin. Bị loại theo Nguyên tắc II.

## R5. Đăng ký hai bước

- **`POST /api/auth/register/start`**:
  - Kiểm tra body (tên đăng nhập, mật khẩu, tên hiển thị, email, `next`). Nếu tên đăng nhập đã có người dùng → `409`
    ngay. Tên đăng nhập không phải bí mật cần giấu ở đây, giống hành vi hiện tại.
  - Băm mật khẩu bằng Argon2id, lưu vào `payload` của dòng mã:
    `{ username, passwordHash, displayName, next }`. Mật khẩu thô không bao giờ được lưu.
- **`POST /api/auth/register/verify {ticket, code}`**: chạy trong một transaction:
  - xác minh mã và xoá dòng;
  - `insertUser({ username, passwordHash, displayName, email, emailVerifiedAt: now })`.

  Nếu vi phạm duy nhất (`users_username_unique` hoặc `users_email_unique`, do có người khác vừa đăng ký) → `409` với thông
  báo tương ứng. Thành công → tạo phiên, trả `201`, cùng một `next` an toàn.
- `POST /api/auth/register` cũ bị **xoá** (không để lại code thừa).

## R6. Quên mật khẩu

- Chỉ tài khoản có `password_hash` và email đã xác thực mới nhận mã thật.
- **`verify {ticket, code, password}`**: chạy trong một transaction:
  - xác minh mã;
  - băm mật khẩu mới;
  - `UPDATE users SET password_hash`;
  - `DELETE FROM sessions WHERE user_id`;
  - xoá `login_attempts` của tên đăng nhập đó (được đăng nhập lại ngay).

  Sau đó tạo phiên mới và trả `200` kèm cookie.
- Mật khẩu mới theo cùng quy tắc với đăng ký (8–200 ký tự).

## R7. Đổi / thêm email ở trang Cá nhân

- Cả hai route đều yêu cầu phiên đăng nhập.
- **`start {email}`**:
  - email trùng email hiện tại của chính mình → `400 VALIDATION` ("Đây là email hiện tại của bạn");
  - email thuộc người khác → xử lý như R4.
  - Dòng mã có `user_id` là chính người yêu cầu.
- **`verify {ticket, code}`**: dòng mã phải cùng `user_id` với phiên; khác thì trả `410` như ticket không tồn tại (không
  phân biệt). Chạy `UPDATE users SET email, email_verified_at = now()`. Vi phạm `users_email_unique` (bị giành trong
  10 phút) → `409` "Email này không dùng được, hãy chọn email khác".
- Gửi lại (`/api/auth/codes/resend`) với mã `change_email` cũng yêu cầu phiên khớp `user_id`.

## R8. Đăng nhập Google theo email

Thứ tự xử lý trong `handleCallback`, sau khi đã kiểm tra claims (`email_verified` bắt buộc như 002):

1. `SELECT … WHERE google_sub = sub` → có thì vào luôn. **Không** còn cập nhật email theo Google: email của tài khoản là
   email chủ tài khoản đã xác thực, có thể khác email Google.
2. `SELECT … WHERE email = normalizeEmail(googleEmail)`; cột `email` chỉ chứa email đã xác thực (FR-E01):
   - tài khoản có `google_sub IS NULL` → `UPDATE users SET google_sub = sub WHERE id = … AND google_sub IS NULL`.
     Không có dòng nào được cập nhật (vừa bị gắn ở tab khác) thì đọc lại và quay về bước 1;
   - tài khoản đã có `google_sub` khác → chuyển tới `/login?error=google_conflict` ("Email này đã gắn với một tài khoản
     Google khác").
3. Không khớp gì → bản ghi chờ như 002, `/login/google`. Ở bước `complete`, tạo user với
   `email = normalizeEmail(googleEmail)`, `email_verified_at = now()`. Nếu vi phạm `users_email_unique` (email vừa được
   ai đó xác thực) → `409 CONFLICT` "Email Google này vừa được dùng cho một tài khoản khác — hãy bấm Tiếp tục với Google
   lần nữa". Lần sau bấm Google sẽ khớp theo bước 2.

## R9. Lược đồ và migration

- Đổi tên cột `users.google_email` → `email`, rồi chuẩn hoá: `UPDATE users SET email = lower(btrim(email)),
  email_verified_at = created_at WHERE email IS NOT NULL`.
- Chỉ mục duy nhất `users_email_unique` trên `email`. Dữ liệu đã chuẩn hoá nên không cần chỉ mục `lower()`.
- CHECK mới:
  - `users_login_method`: `(username IS NULL) = (password_hash IS NULL) AND (username IS NOT NULL OR google_sub IS NOT NULL)`;
  - `users_email_verified`: `(email IS NULL) = (email_verified_at IS NULL)`;
  - `users_email_length`: `email IS NULL OR char_length(email) <= 254`.
- Bỏ CHECK `users_one_login_method` và `users_google_email_length`.
- `pending_google_signups.google_email` giữ nguyên tên: đó là email do Google trả về.
- drizzle-kit sinh phần DDL; câu `UPDATE` chuẩn hoá được thêm tay vào giữa, trước khi tạo chỉ mục duy nhất.

## R10. Giao diện

- **`CodeStep`** (client) dùng chung cho đăng ký, quên mật khẩu và đổi email:
  - ô nhập `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength=6`;
  - dòng "Đã gửi mã tới a•••@gmail.com — kiểm tra cả thư mục Spam";
  - nút "Gửi lại" có đếm ngược 60 giây;
  - liên kết "Đổi email".
  - Che email chỉ để hiển thị: client đã biết email do chính người dùng nhập.
- **`/login`**:
  - chế độ Đăng ký thêm ô Email; nút đổi thành "Gửi mã" → `CodeStep`;
  - chế độ Đăng nhập thêm liên kết "Quên mật khẩu?" → `/forgot-password`.
- **`/forgot-password`** (công khai, `robots: noindex`): bước email → bước mã + mật khẩu mới → vào `HOME_PATH`.
- **`/me` → `EmailCard`**:
  - chưa có email → khung cảnh báo màu butter, nội dung "Bạn chưa có email…", kèm ô email và nút "Gửi mã";
  - có email → dòng email kèm nút "Đổi", mở `CodeStep`.
