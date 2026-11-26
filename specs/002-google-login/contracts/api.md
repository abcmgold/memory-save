# HTTP Contract: Đăng nhập bằng Google (002-google-login)

Bổ sung cho [001 contracts/api.md](../../001-daily-journal/contracts/api.md): cùng định dạng lỗi JSON, cùng cookie
phiên `ms_session` (30 ngày, gia hạn trượt), cùng kiểm tra `Origin` cho request ghi.

## GET `/api/auth/google/start?next=<path>`

Bắt đầu luồng. Không cần đăng nhập.

- Chưa cấu hình Google → `302 /login`.
- Ngược lại → `302` tới `https://accounts.google.com/o/oauth2/v2/auth` với `client_id`, `redirect_uri`
  (`<origin>/api/auth/google/callback`), `response_type=code`, `scope=openid email profile`, `state`,
  `code_challenge` (S256), `code_challenge_method=S256`, `prompt=select_account`.
- `Set-Cookie: ms_oauth=<b64url json {state, verifier, next}>; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600[; Secure]`
- `next` qua `safeNext()`; không hợp lệ → bỏ.
- `Cache-Control: no-store`.

## GET `/api/auth/google/callback?code=…&state=…` (hoặc `?error=…`)

Google chuyển hướng về đây. Luôn xóa cookie `ms_oauth`. Mọi kết quả là `302`:

| Tình huống | Chuyển tới | Cookie đặt |
|---|---|---|
| `error=access_denied` | `/login?error=google_cancelled[&next=…]` | — |
| thiếu cookie / `state` không khớp / thiếu `code` / Google lỗi / claims sai | `/login?error=google_failed` | — |
| `email_verified` ≠ true | `/login?error=google_unverified` | — |
| `google_sub` đã có user | `next` hoặc `/` | `ms_session` |
| `google_sub` chưa có user | `/login/google` | `ms_gsignup=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=600[; Secure]` |

## Trang `/login/google`

Server Component. Đọc `ms_gsignup` → dòng `pending_google_signups` còn hạn.

- Không có / hết hạn → `redirect("/login?error=google_expired")`.
- Đã đăng nhập → `redirect(next ?? "/")`.
- Hiển thị: email Google (chỉ người này thấy), ô "Tên hiển thị" điền sẵn `suggested_name` (≤ 50 ký tự, bắt buộc),
  nút "Bắt đầu", dòng nhắc "Đã có tài khoản? Đăng nhập bằng tên đăng nhập và mật khẩu" → `/login`.

## POST `/api/auth/google/complete`

Body: `{ "displayName": string }` — cùng quy tắc với `RegisterBody.displayName`.

| Kết quả | HTTP | Body / header |
|---|---|---|
| Tạo user thành công | `201` | `{ user: UserRef, next: string | null }`, `Set-Cookie: ms_session=…`, xóa `ms_gsignup` |
| `google_sub` vừa được tạo bởi request khác | `200` | như trên, đăng nhập vào user đã có |
| Thiếu/sai/hết hạn `ms_gsignup` | `410` `GONE` | `message`: "Phiên đăng ký bằng Google đã hết hạn. Vui lòng thử lại." |
| Tên trống / > 50 ký tự | `400` `VALIDATION` | `fields.displayName` |
| Origin sai | `403` `BAD_ORIGIN` | |

Mã lỗi mới: `GONE` (410). Client khi gặp `410` → chuyển về `/login?error=google_expired`.

## Thay đổi endpoint cũ

- `GET /api/me`: thêm `googleEmail: string | null` (chỉ chính chủ); `username` có thể là `null`.
- `POST /api/auth/login`: tài khoản Google (không có username) không bao giờ khớp → `401 INVALID_CREDENTIALS` như
  thường (FR-G11).
- Mọi `UserRef` trả cho người khác **không** có `username`/`googleEmail` (không đổi so với FR-038).

## Trang `/login`

- Nhận thêm `searchParams.error ∈ {google_cancelled, google_failed, google_unverified, google_expired}` → hiển thị
  thông báo tiếng Việt; giá trị khác bị bỏ qua.
- Khi đã cấu hình Google: nút "Tiếp tục với Google" (link thường tới `/api/auth/google/start?next=<next>`) ở cả hai tab.
