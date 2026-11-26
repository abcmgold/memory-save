# Data Model: Đăng nhập bằng Google (002-google-login)

Bổ sung cho [001 data-model](../001-daily-journal/data-model.md). Migration: `drizzle/0003_google_login.sql` —
**không phá hủy**: chỉ bỏ NOT NULL, thêm cột, thêm ràng buộc mà mọi dòng hiện có đều thỏa.

## users (sửa)

| Cột | Kiểu | Thay đổi | Ghi chú |
|---|---|---|---|
| `username` | text, UNIQUE | **bỏ NOT NULL** | null với tài khoản Google; CHECK định dạng cũ giữ nguyên (NULL vẫn qua) |
| `password_hash` | text | **bỏ NOT NULL** | null với tài khoản Google |
| `google_sub` | text, UNIQUE | **mới**, nullable | claim `sub` của Google — định danh cố định (FR-G04) |
| `google_email` | text | **mới**, nullable | chỉ trả cho chính chủ (FR-G09); tối đa 320 ký tự |

Ràng buộc mới:

- `users_one_login_method` CHECK:
  `(username IS NOT NULL AND password_hash IS NOT NULL AND google_sub IS NULL)`
  `OR (google_sub IS NOT NULL AND username IS NULL AND password_hash IS NULL)`
- `users_google_email_length` CHECK: `google_email IS NULL OR char_length(google_email) <= 320`
- `users_google_sub_unique` UNIQUE(`google_sub`)

Không đổi: `handle`, `invite_token`, `display_name` (1–50 ký tự, bắt buộc), `last_audience`.

## pending_google_signups (mới)

Người đã qua Google nhưng chưa xác nhận tên hiển thị (spec: "Đăng ký Google đang chờ").

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `token_hash` | text PK | SHA-256 hex của token trong cookie `ms_gsignup` |
| `google_sub` | text NOT NULL | |
| `google_email` | text NOT NULL | |
| `suggested_name` | text NOT NULL | tên Google đã trim, cắt ≤ 50 ký tự; có thể rỗng |
| `next` | text NULL | đã qua `safeNext()` |
| `expires_at` | timestamptz NOT NULL | `created_at + 10 phút` |
| `created_at` | timestamptz NOT NULL default now() | |

Index: `pending_google_signups_expires_idx (expires_at)` cho việc dọn dẹp.

Vòng đời:

```text
callback (sub chưa có) ──► [pending] ──complete hợp lệ──► user được tạo + dòng bị xóa (cùng transaction)
                              │
                              ├── quá expires_at ──► complete trả "google_expired"; cron cleanup xóa
                              └── callback lần nữa cho cùng trình duyệt ──► dòng mới, cookie mới
```

## Trạng thái tạm (không lưu DB)

- Cookie `ms_oauth` (10 phút, Path `/api/auth/google`): `{ state, verifier, next }` — xem research R3.

## Quy tắc kiểm tra (domain thuần, có unit test)

- `checkGoogleClaims(claims, clientId, now)` → `{ sub, email, name } | lỗi "unverified" | lỗi "invalid"` (research R2).
- `suggestDisplayName(name)`: trim, gộp khoảng trắng, cắt ≤ 50 ký tự (không cắt giữa ký tự ghép); trống → `""`
  (người dùng phải tự nhập — spec Edge Cases).
- Tên xác nhận ở `complete` dùng đúng schema `displayName` của đăng ký thường (FR-G03).
