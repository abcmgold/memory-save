# API Contract: 005 Email xác thực bằng OTP

Mọi route nhận JSON qua `POST` và bị chặn nếu Origin không khớp (`checkOrigin`, như hiện tại). Phản hồi lỗi theo dạng
chung `{ error: { code, message, fields? } }`. Mọi phản hồi có `Cache-Control: no-store`.

Mã lỗi mới:

- `CODE_INVALID` (422): mã sai, còn lượt nhập; kèm `attemptsLeft`.
- `MAIL_UNAVAILABLE` (503): chưa cấu hình gửi mail.
- `MAIL_FAILED` (502): gửi thư thất bại.

Mã lỗi dùng lại:

- `GONE` (410): ticket không tồn tại, hết hạn, đã dùng, sai quá 5 lần, sai mục đích hoặc thuộc người khác. Thông báo
  chung: "Mã đã hết hiệu lực, hãy gửi mã mới".
- `RATE_LIMITED` (429): kèm `retryAfter` (giây) khi đang trong thời gian chờ 60 giây.
- `CONFLICT` (409), `VALIDATION` (400), `UNAUTHENTICATED` (401).

Phản hồi "đã gửi mã" chung (202): `{ "ticket": "<base64url>", "resendIn": 60, "expiresIn": 600 }`

## Đăng ký

### POST /api/auth/register/start

Body:

```json
{ "username": "an_nguyen", "password": "…", "displayName": "An Nguyễn", "email": "An@Gmail.com", "next": "/add/…" }
```

| Kết quả | Mã |
|---|---|
| Hợp lệ (kể cả khi email đã có tài khoản — R4) | 202 + phản hồi "đã gửi mã" |
| Sai định dạng (`fields.username` / `password` / `displayName` / `email`; email trống → "Email không được để trống.") | 400 VALIDATION |
| Tên đăng nhập đã có người dùng | 409 CONFLICT (`fields.username`) |
| Vượt giới hạn email/IP | 429 RATE_LIMITED |
| Chưa cấu hình mail / gửi lỗi | 503 MAIL_UNAVAILABLE / 502 MAIL_FAILED |

### POST /api/auth/register/verify

Body: `{ "ticket": "…", "code": "123456" }`

| Kết quả | Mã |
|---|---|
| Đúng mã | 201 `{ user: UserRef, next: string \| null }` + `Set-Cookie: ms_session` |
| Sai mã, còn lượt | 422 CODE_INVALID `{ attemptsLeft }` |
| Ticket không dùng được, hết hạn, sai lần thứ 5, sai mục đích | 410 GONE |
| Tên đăng nhập hoặc email vừa bị người khác dùng | 409 CONFLICT |

`POST /api/auth/register` (cũ): **bị xoá**.

## Gửi lại mã (mọi mục đích)

### POST /api/auth/codes/resend

Body: `{ "ticket": "…" }`. Với mục đích `change_email`, cần phiên đăng nhập của đúng người yêu cầu; nếu không khớp thì
trả 410 như ticket không tồn tại.

| Kết quả | Mã |
|---|---|
| Đã gửi mã mới | 202 `{ resendIn: 60, expiresIn: 600 }` |
| Chưa đủ 60 giây | 429 RATE_LIMITED `{ retryAfter }` |
| Vượt giới hạn email/IP | 429 RATE_LIMITED |
| Ticket không dùng được | 410 GONE |
| Mail lỗi / chưa cấu hình | 502 / 503 |

## Quên mật khẩu

### POST /api/auth/password-reset/start

Body: `{ "email": "an@gmail.com" }`

| Kết quả | Mã |
|---|---|
| Email hợp lệ (có hoặc không có tài khoản — R4). Thư được gửi trong `after()` | 202 + phản hồi "đã gửi mã" |
| Sai định dạng | 400 VALIDATION |
| Vượt giới hạn | 429 RATE_LIMITED |
| Chưa cấu hình mail | 503 MAIL_UNAVAILABLE |

### POST /api/auth/password-reset/verify

Body: `{ "ticket": "…", "code": "123456", "password": "mật khẩu mới" }`

| Kết quả | Mã |
|---|---|
| Đúng mã | 200 `{ user: UserRef }` + `Set-Cookie: ms_session` (phiên mới); mọi phiên cũ bị xoá |
| Mật khẩu không hợp lệ | 400 VALIDATION (không tính là một lần nhập sai) |
| Sai mã | 422 CODE_INVALID |
| Ticket không dùng được | 410 GONE |

## Email của tôi (cần đăng nhập)

### POST /api/me/email/start

Body: `{ "email": "moi@gmail.com" }`

| Kết quả | Mã |
|---|---|
| Đã gửi (kể cả khi email thuộc người khác — R4) | 202 + phản hồi "đã gửi mã" |
| Chưa đăng nhập | 401 UNAUTHENTICATED |
| Trùng email hiện tại / sai định dạng | 400 VALIDATION |
| Giới hạn / mail | 429 / 502 / 503 |

### POST /api/me/email/verify

Body: `{ "ticket": "…", "code": "123456" }`

| Kết quả | Mã |
|---|---|
| Đúng mã | 200 `{ email }` |
| Chưa đăng nhập | 401 |
| Ticket của người khác / không dùng được | 410 GONE |
| Sai mã | 422 CODE_INVALID |
| Email vừa bị tài khoản khác xác thực | 409 CONFLICT |

### GET /api/me (sửa)

Trường `googleEmail` đổi thành `email` (chỉ trả cho chính chủ).

## Google (sửa — 002 contracts/api.md)

- `GET /api/auth/google/callback`: thêm nhánh khớp email (research R8). Mã lỗi chuyển hướng mới:
  `/login?error=google_conflict`.
- `POST /api/auth/google/complete`: thêm `409 CONFLICT` khi email Google vừa được tài khoản khác xác thực.

## Trang (route tiếng Anh)

| Route | Truy cập | Ghi chú |
|---|---|---|
| `/login` | công khai | Đăng ký: + ô Email → bước nhập mã. Đăng nhập: + "Quên mật khẩu?" |
| `/forgot-password` | công khai, `noindex` | email → mã + mật khẩu mới |
| `/me` | riêng tư | + thẻ Email (cảnh báo hoặc hiện email + đổi) |

## Thư (tiếng Việt, không có liên kết — FR-E04)

| Loại | Tiêu đề |
|---|---|
| Mã đăng ký / đổi email / quên mật khẩu | `{code} là mã MemorySave của bạn`. Thân thư: mục đích, mã, hiệu lực 10 phút, "đừng chia sẻ mã này" |
| Email đã có tài khoản | `Email này đã có tài khoản MemorySave`. Thân thư: hãy đăng nhập hoặc dùng Quên mật khẩu; nếu không phải bạn yêu cầu, hãy bỏ qua |
| Tài khoản chỉ dùng Google (quên mật khẩu) | `Tài khoản MemorySave của bạn dùng Google`. Thân thư: bấm "Tiếp tục với Google" để đăng nhập |
