# Quickstart: kiểm tra 005 Email xác thực bằng OTP

## Chuẩn bị

- Local: `npm run dev:local`. Không cần SMTP: `LogMailer` ghi thư ra terminal, ví dụ dòng
  `[mail] to=an@example.com subject=123456 là mã MemorySave của bạn`.
- Muốn thử gửi thật ở local: thêm `SMTP_USER` và `SMTP_PASS` (App Password) vào `.env.local`.
  - Mạng công ty có thể chặn `smtp.gmail.com`.
  - Ở chế độ local, `LogMailer` luôn được dùng trừ khi đặt `MAIL_TRANSPORT=smtp`.
- Production (Vercel): đặt `SMTP_USER`, `SMTP_PASS`, và tuỳ chọn `MAIL_FROM_NAME`. Hướng dẫn tạo App Password ở
  `docs/DEPLOY.md`.

## Tự động

```bash
npm test          # unit + integration (MemoryMailer, PGlite)
npm run typecheck && npm run lint
```

Kỳ vọng xanh toàn bộ, gồm:

- `email-code`, `mail-templates`;
- `email-signup`, `password-reset`, `me-email`;
- `google-login` (khớp email);
- `migration-0004`.

## Thủ công

1. **Đăng ký (US1)**: `/login` → Đăng ký → điền 4 ô → "Gửi mã".
   - Lấy mã trong terminal, nhập vào → vào `/camera`. `/me` hiện email.
   - Thử nhập sai 5 lần → mã hết hiệu lực.
   - Thử "Gửi lại" trước 60 giây → bị chặn, có đếm ngược.
2. **Email đã có tài khoản (US1-7)**: đăng ký tài khoản khác với cùng email.
   - Giao diện vẫn báo "Đã gửi mã".
   - Thư trong terminal là thư "đã có tài khoản", không có mã; mọi mã nhập vào đều sai.
3. **Quên mật khẩu (US3)**:
   - Đăng nhập ở trình duyệt A.
   - Ở trình duyệt B vào `/login` → "Quên mật khẩu?" → nhập email → nhập mã + mật khẩu mới → vào app.
   - Tải lại A → bị đưa về `/login`. Mật khẩu cũ không còn dùng được.
   - Thử với email không tồn tại → phản hồi y như trên, không có thư.
4. **Tài khoản cũ (US4)**:
   - Đăng nhập một tài khoản tạo trước 005 → `/me` có cảnh báo, các trang khác không có.
   - Thêm email → cảnh báo biến mất.
5. **Google theo email (US2)**: trên production hoặc mạng không chặn Google, với tài khoản có email đã xác thực là Gmail
   X:
   - đăng xuất → "Tiếp tục với Google" bằng X → vào đúng tài khoản cũ, không qua bước tên;
   - đăng xuất → đăng nhập bằng mật khẩu → vẫn được.
6. **Riêng tư**: đăng nhập bằng tài khoản bạn bè, xem danh sách bạn, trang mời và ảnh xem trước. Email không xuất hiện ở
   đâu cả.

## Sau deploy

- Kiểm tra thư thật tới Gmail (có thể vào Spam lần đầu; đánh dấu "Không phải spam").
- Kiểm tra log Vercel không có mã, ticket hay email.
