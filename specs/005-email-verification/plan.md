# Implementation Plan: Email xác thực bằng OTP, đăng nhập Google theo email, quên mật khẩu

**Branch**: `005-email-verification` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-email-verification/spec.md`

## Summary

Tài khoản có thêm **email đã xác thực** (`users.email` + `email_verified_at`, duy nhất). Email chỉ được ghi vào tài
khoản sau khi người dùng nhập đúng mã 6 số gửi qua Gmail SMTP (`nodemailer`), hoặc khi Google xác nhận email.

Kỹ thuật chính:

- Mã nằm trong bảng `email_codes`. Mỗi lần gửi trả về một `ticket` ngẫu nhiên cho trình duyệt; DB chỉ giữ
  `sha256(ticket)` và `sha256(ticket:code)`, nên lộ DB cũng không lộ mã.
- Mỗi mã gắn một mục đích (`signup` / `change_email` / `reset_password`), dùng một lần, sống 10 phút, sai 5 lần là
  huỷ, gửi lại phải cách 60 giây.
- Giới hạn gửi đếm trong bảng `email_sends` (5 lần / email / giờ, 20 lần / IP / giờ).
- Không tiết lộ email có tài khoản hay chưa:
  - Đăng ký hoặc đổi email sang một email đã có người dùng → vẫn tạo `ticket`, nhưng thư gửi đi báo "email này đã có
    tài khoản" và không có mã đúng nào.
  - Quên mật khẩu → luôn trả cùng một phản hồi; thư được gửi trong `after()` nên thời gian phản hồi như nhau.
- Đăng nhập Google xét theo thứ tự: `google_sub` → email đã xác thực trùng email Google (gắn `google_sub`) → trùng
  email nhưng đã gắn Google khác thì từ chối (`google_conflict`) → không khớp thì tạo tài khoản mới như 002.
- CHECK "đúng một cách đăng nhập" được nới thành "có ít nhất một cách; tên đăng nhập và mật khẩu đi đôi".
- Local và test dùng `LogMailer`: mã được ghi ra log thay vì gửi thư.

Chi tiết: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22 — như 001

**Primary Dependencies**: Thêm `nodemailer@10.6.1` (và `@types/nodemailer` cho dev) để gửi qua Gmail SMTP — xem
research R1. Còn lại dùng những gì đã có: Next.js 16 (`after()` từ `next/server`), Drizzle, zod, `node:crypto`,
`@node-rs/argon2`.

**Storage**: PostgreSQL (Neon / PGlite local), migration `0004`:

- `users`: đổi tên `google_email` → `email`, thêm `email_verified_at`, thay các CHECK;
- thêm bảng `email_codes` và `email_sends`.

**Testing**: Vitest.

- Unit:
  - `tests/unit/email-code.test.ts` (chuẩn hoá và kiểm tra email, mã, băm, thời gian chờ);
  - `tests/unit/mail-templates.test.ts`.
- Integration, chạy trên PGlite với `MemoryMailer` (không gửi mạng):
  - `email-signup.test.ts`;
  - `password-reset.test.ts`;
  - `me-email.test.ts`;
  - `google-login.test.ts` (bổ sung khớp theo email);
  - `migration-0004.test.ts`.

**Target Platform**: Vercel (Node runtime) + trình duyệt di động — như 001. Vercel không chặn SMTP ra ngoài cổng 465.

**Project Type**: Web application (một project Next.js full-stack)

**Performance Goals**:

- Đăng ký trọn vẹn < 2 phút (SC-001), chủ yếu là thời gian mở hộp thư.
- Mỗi lần gửi mã: 1 lần gửi SMTP (khoảng 1–2 giây) cộng 3–4 truy vấn DB.

**Constraints**:

- `SMTP_USER` / `SMTP_PASS` (App Password) chỉ nằm ở `.env.local` và trên Vercel.
- Không ghi mã, ticket hay email ra log production.
- Email chỉ trả về cho chính chủ tài khoản.
- Giao diện tiếng Việt, dùng tốt từ 360px; route tiếng Anh.

**Scale/Scope**: < 100 người dùng, < 50 thư/ngày.

- 6 route handler mới, xoá 1 (`POST /api/auth/register`).
- 1 trang mới (`/forgot-password`).
- Sửa `/login` (đăng ký 2 bước, liên kết quên mật khẩu) và `/me` (thẻ email).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Kết quả |
|---|---|---|
| **I. Đơn giản trước tiên** | Thêm một dependency `nodemailer`. Lý do: spec chốt Gmail SMTP, và tự viết SMTP + TLS + AUTH thì phức tạp và rủi ro hơn nhiều (R1). Không thêm service hay hàng đợi: gửi đồng bộ trong request, riêng quên mật khẩu dùng `after()` (R4). Mỗi bảng mới theo đúng mẫu `login_attempts` / `pending_google_signups`. Ghi trong Complexity Tracking. | ✅ PASS (có biện minh) |
| **II. Riêng tư mặc định** | Không đụng quyền xem bài. `email` chỉ có trong `SessionUser` và `/api/me` của chính chủ; `UserRef` giữ nguyên. Có test email không xuất hiện ở bạn bè, trang mời hay OG. Gắn Google chỉ qua email **đã xác thực** ở cả hai phía (SC-003), có test cho ca bị từ chối. Phản hồi gửi mã không tiết lộ email đã có tài khoản (FR-E05). | ✅ PASS |
| **III. Logic có test** | Logic thuần trong `domain/email-code.ts` (chuẩn hoá, sinh và băm mã, thời gian chờ) có unit test. Integration test cả ca bị từ chối: sai mã, quá 5 lần, hết hạn, sai mục đích, ticket của người khác, gửi lại sớm, vượt giới hạn email/IP, email trùng, Google trùng email đã gắn sub khác, email chưa xác thực, đổi email khi chưa đăng nhập. | ✅ PASS |
| **IV. Media an toàn** | Không liên quan. | ✅ N/A |
| **V. Dữ liệu bền vững** | Migration `0004` chỉ đổi tên cột, thêm cột, bảng và CHECK mà dữ liệu cũ thoả. Email Google cũ được chuẩn hoá và đánh dấu đã xác thực, có test migration chứng minh user cũ đăng nhập được. Backup bằng `pg_dump` tự bao gồm phần mới. | ✅ PASS |
| **Ràng buộc kỹ thuật** | Mật khẩu vẫn Argon2id; ở bước đăng ký, mật khẩu được băm **trước** khi lưu vào bản ghi chờ, không bao giờ lưu dạng thô. Bí mật SMTP không commit, `.env.example` có placeholder. Chạy local không cần SMTP (`LogMailer`). | ✅ PASS |
| **Quy trình** | Thay đổi đụng xác thực + lược đồ → rà soát riêng theo II và V trước khi merge. | ✅ ghi nhận |

**Re-check sau Phase 1**: data model, contract và quickstart không thêm thành phần ngoài bảng trên → ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/005-email-verification/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
drizzle/0004_email_verification.sql           # mới (drizzle-kit generate + phần UPDATE dữ liệu viết tay)
.env.example · docs/DEPLOY.md · README.md     # SMTP_USER / SMTP_PASS / MAIL_FROM_NAME, hướng dẫn App Password
src/
├── server/
│   ├── env.ts                                # + getMailConfig() (tuỳ chọn, không throw)
│   ├── db/schema.ts                          # users: email, emailVerifiedAt, CHECK mới; + emailCodes, emailSends
│   ├── domain/email-code.ts                  # mới, thuần: normalizeEmail, isValidEmail, newCode, hashes, cooldown
│   ├── mail/
│   │   ├── mailer.ts                         # mới: Mailer interface, SmtpMailer (nodemailer), LogMailer, get/set
│   │   └── templates.ts                      # mới, thuần: thư mã / "đã có tài khoản" / "tài khoản Google"
│   ├── services/
│   │   ├── email-codes.ts                    # mới: issue, resend, consume (đếm sai, hết hạn, mục đích), giới hạn gửi
│   │   ├── email-signup.ts                   # mới: startSignup, verifySignup
│   │   ├── password-reset.ts                 # mới: startReset, verifyReset (huỷ phiên, phiên mới)
│   │   ├── account-email.ts                  # mới: startEmailChange, verifyEmailChange
│   │   ├── auth.ts                           # bỏ registerUser (thay bằng email-signup)
│   │   ├── google-login.ts                   # khớp theo email đã xác thực; google_conflict; không ghi đè email
│   │   ├── sessions.ts                       # SessionUser.googleEmail → email; + deleteUserSessions()
│   │   └── cleanup.ts                        # + xoá email_codes hết hạn, email_sends > 1 giờ
│   └── http/
│       ├── schemas.ts                        # + SignupStartBody, CodeVerifyBody, ResetStart/VerifyBody, EmailStartBody
│       └── request.ts                        # + clientIp(req)
├── lib/messages.ts                           # + thông báo email/mã; mã lỗi CODE_INVALID, MAIL_UNAVAILABLE, MAIL_FAILED;
│                                             #   google_conflict
├── app/
│   ├── api/auth/register/route.ts            # XOÁ (thay bằng start/verify)
│   ├── api/auth/register/start/route.ts      # mới
│   ├── api/auth/register/verify/route.ts     # mới
│   ├── api/auth/password-reset/start/route.ts   # mới
│   ├── api/auth/password-reset/verify/route.ts  # mới
│   ├── api/auth/codes/resend/route.ts        # mới (mọi mục đích)
│   ├── api/me/email/start/route.ts           # mới
│   ├── api/me/email/verify/route.ts          # mới
│   ├── api/me/route.ts                       # googleEmail → email
│   ├── login/LoginForm.tsx                   # đăng ký: + ô email → bước nhập mã; liên kết "Quên mật khẩu?"
│   ├── forgot-password/page.tsx · ForgotPasswordForm.tsx   # mới
│   └── (app)/me/page.tsx                     # + EmailCard
└── components/
    ├── auth/CodeStep.tsx                     # mới: ô 6 số, đếm ngược gửi lại, nhắc kiểm tra Spam (dùng lại 3 nơi)
    └── profile/EmailCard.tsx                 # mới: cảnh báo chưa có email / hiện email + đổi email
tests/
├── unit/email-code.test.ts · unit/mail-templates.test.ts          # mới
├── integration/email-signup.test.ts · password-reset.test.ts · me-email.test.ts · migration-0004.test.ts  # mới
├── integration/google-login.test.ts · auth.test.ts · username-privacy.test.ts   # sửa
└── helpers/memory-mailer.ts                  # mới
```

**Structure Decision**: Giữ nguyên cấu trúc của 001/002:

- logic thuần trong `src/server/domain`;
- nghiệp vụ trong `src/server/services`;
- gửi thư tách vào `src/server/mail` sau một interface, để test thay được và sau này đổi nhà cung cấp chỉ cần sửa một
  file;
- Route Handler mỏng.

## Complexity Tracking

| Vi phạm | Vì sao cần | Phương án đơn giản hơn bị loại vì |
|---|---|---|
| Dependency mới `nodemailer` | Spec chốt gửi qua Gmail SMTP (FR-E04, quyết định 2026-11-26) | Tự viết client SMTP trên `node:tls` (EHLO, AUTH LOGIN, MIME UTF-8 cho tiếng Việt) dễ sai và khó bảo trì. Gmail không có HTTP API gửi thư nếu không có OAuth riêng. Các dịch vụ HTTP (Resend…) cần tên miền riêng, mà app chưa có. |
