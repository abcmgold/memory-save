# Data Model: 005 Email xác thực bằng OTP

Migration: `drizzle/0004_email_verification.sql`, không phá huỷ dữ liệu (Nguyên tắc V). Xem research R9.

## users (sửa)

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `email` | text, null | UNIQUE `users_email_unique`; ≤ 254 ký tự (`users_email_length`); luôn ở dạng chuẩn hoá (cắt khoảng trắng, chữ thường) | Đổi tên từ `google_email`. **Chỉ chứa email đã xác thực** (FR-E01). Chỉ chủ tài khoản thấy (FR-E15). |
| `email_verified_at` | timestamptz, null | `users_email_verified`: `(email IS NULL) = (email_verified_at IS NULL)` | Thời điểm xác thực: theo mã, theo Google, hoặc bằng `created_at` với tài khoản Google cũ khi migrate. |
| `username`, `password_hash` | (giữ) | `users_login_method`: `(username IS NULL) = (password_hash IS NULL) AND (username IS NOT NULL OR google_sub IS NOT NULL)` | Thay `users_one_login_method`. Tài khoản có thể vừa có mật khẩu vừa có Google (FR-E10). |
| `google_sub` | (giữ) | UNIQUE | Gắn thêm khi đăng nhập Google khớp email đã xác thực (FR-E09). |

Bỏ: CHECK `users_one_login_method`, CHECK `users_google_email_length`.

**Validation (ứng dụng)**: `normalizeEmail(s) = s.trim().toLowerCase()`; `isValidEmail` dùng `z.email()` của zod trên giá
trị đã chuẩn hoá, độ dài ≤ 254.

## email_codes (mới)

Một mã xác thực đang chờ; dùng một lần.

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `ticket_hash` | text | PK | `sha256(ticket)`, hex (R2) |
| `purpose` | text | CHECK `purpose IN ('signup','change_email','reset_password')` | FR-E02 |
| `email` | text | NOT NULL, đã chuẩn hoá, ≤ 254 | Email nhận thư |
| `user_id` | uuid, null | FK → `users.id` ON DELETE CASCADE | `change_email`: người yêu cầu. `reset_password`: tài khoản đích (null nếu không có hoặc chỉ dùng Google). `signup`: null. |
| `code_hash` | text | NOT NULL | `sha256(ticket + ":" + code)`. Với "mã ngầm" (R4) là băm của một mã ngẫu nhiên không gửi đi. |
| `delivery` | text | NOT NULL, CHECK `delivery IN ('code','email_taken','google_account','none')` | Thư gửi đi: mã thật, hoặc thư không có mã (R4). Khác `'code'` thì `code_hash` là mã ngầm. Giữ để "gửi lại" gửi đúng loại thư. |
| `payload` | jsonb, null | | `signup`: `{ username, passwordHash, displayName, next }`. Không bao giờ chứa mật khẩu thô. |
| `attempts` | integer | NOT NULL DEFAULT 0, CHECK `attempts BETWEEN 0 AND 5` | Số lần nhập sai (FR-E03) |
| `sent_at` | timestamptz | NOT NULL | Lần gửi gần nhất; tính thời gian chờ 60 giây |
| `expires_at` | timestamptz | NOT NULL | `sent_at + 10 phút` |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

Chỉ mục: `email_codes_lookup_idx (purpose, email)`, `email_codes_expires_idx (expires_at)`.

**Vòng đời**:

```text
start ──► [chờ] ──(đúng mã, trong transaction nghiệp vụ)──► xoá
            │ ├─(sai, attempts < 5)──► [chờ, attempts+1]
            │ ├─(sai lần thứ 5)──► [chết: attempts=5] ──► 410 (chỉ "gửi lại" mới hồi sinh)
            │ ├─(resend ≥ 60s)──► [chờ, mã mới, attempts=0, hạn mới]
            │ └─(start lại cùng purpose+email[+user])──► xoá
            └─(quá expires_at)──► coi như không tồn tại; cron xoá
```

## email_sends (mới)

Nhật ký gửi thư, dùng để giới hạn tần suất (FR-E03). Theo mẫu `login_attempts`.

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | uuid | PK default random | |
| `email` | text | NOT NULL | đã chuẩn hoá |
| `ip` | text | NOT NULL | `clientIp(req)` hoặc `"unknown"` |
| `sent_at` | timestamptz | NOT NULL DEFAULT now() | |

Chỉ mục: `email_sends_email_idx (email, sent_at)`, `email_sends_ip_idx (ip, sent_at)`.

Quy tắc: chặn khi trong 60 phút gần nhất có ≥ 5 dòng cùng `email` hoặc ≥ 20 dòng cùng `ip`. Cron xoá dòng cũ hơn 1 giờ.

## pending_google_signups (giữ)

Không đổi cột. Khi `complete`, tạo user với `email = normalizeEmail(google_email)` và `email_verified_at = now()`.

## SessionUser (kiểu trong ứng dụng)

`googleEmail` → `email: string | null`. Chỉ dùng cho trang của chính chủ và `/api/me`.
