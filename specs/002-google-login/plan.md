# Implementation Plan: Đăng nhập bằng Google

**Branch**: `002-google-login` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-google-login/spec.md`

## Summary

Thêm "Tiếp tục với Google" bên cạnh đăng nhập mật khẩu. Kỹ thuật: OpenID Connect Authorization Code + PKCE gọi thẳng
endpoint của Google bằng `fetch` (không thêm dependency); `state`/`verifier`/`next` giữ trong cookie ngắn hạn
`ms_oauth`; ID token nhận trực tiếp từ token endpoint, kiểm tra claims bằng hàm thuần. Tài khoản Google đã có → tạo
phiên `ms_session` như cũ. Chưa có → lưu "đăng ký đang chờ" (bảng `pending_google_signups`, token băm, 10 phút), chuyển
tới `/login/google` để xác nhận tên hiển thị (điền sẵn tên Google), rồi tạo user + phiên trong một transaction.
`users` thêm `google_sub`/`google_email`, `username`/`password_hash` thành nullable, CHECK đúng một cách đăng nhập.
Chi tiết: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22 — như 001

**Primary Dependencies**: Không thêm. Dùng lại Next.js 16 (App Router, Route Handlers), Drizzle, zod, `node:crypto`,
`fetch` toàn cục

**Storage**: PostgreSQL (Neon / PGlite local) — sửa `users`, thêm `pending_google_signups` (migration `0003`)

**Testing**: Vitest — unit `tests/unit/google-identity.test.ts`; integration `tests/integration/google-login.test.ts`
trên PGlite với `GoogleOAuthClient` giả (không gọi mạng)

**Target Platform**: Vercel (Node runtime) + trình duyệt di động/desktop — như 001

**Project Type**: Web application (một project Next.js full-stack)

**Performance Goals**: Toàn luồng người mới < 30 giây (SC-001), chủ yếu phụ thuộc màn hình Google; mỗi bước server
1–2 truy vấn DB + 1 request tới Google

**Constraints**: Không lưu bí mật trong mã; nút ẩn khi thiếu env; redirect URI phải đăng ký trước cho từng domain;
cookie `SameSite=Lax` để sống qua chuyển hướng từ Google; tiếng Việt; 360px

**Scale/Scope**: < 100 người dùng; 3 route handler mới, 1 trang mới, sửa trang `/login` và `/friends`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Kết quả |
|---|---|---|
| **I. Đơn giản trước tiên** | Không dependency mới, không service mới; một bảng tạm nhỏ dùng đúng mẫu `sessions`; không cơ chế liên kết/nhiều nhà cung cấp (spec đã bỏ). | ✅ PASS |
| **II. Riêng tư mặc định** | Không đụng quyền xem bài. `google_email` chỉ trả cho chính chủ (như `username`, FR-038); `UserRef` không đổi; test integration kiểm email không xuất hiện trong phản hồi của người khác. Danh tính Google chỉ server giữ; client chỉ gửi tên. | ✅ PASS |
| **III. Logic có test** | `checkGoogleClaims`, `suggestDisplayName` thuần + unit test; integration test cả ca bị từ chối: state sai, thiếu cookie, email chưa xác minh, bước tên hết hạn/khác trình duyệt, `next` ra ngoài, tài khoản Google vào form mật khẩu. | ✅ PASS |
| **IV. Media an toàn** | Không liên quan (không dùng ảnh đại diện Google). | ✅ N/A |
| **V. Dữ liệu bền vững** | Migration `0003` chỉ bỏ NOT NULL + thêm cột/bảng/ràng buộc mà dữ liệu cũ thỏa; có test migration (như `migration-0001.test.ts`) chứng minh user cũ còn nguyên và đăng nhập được. Backup/restore dùng `pg_dump` nên tự bao gồm cột/bảng mới. | ✅ PASS |
| **Ràng buộc kỹ thuật** | Mật khẩu vẫn Argon2id; `GOOGLE_CLIENT_SECRET` chỉ ở `.env.local`/Vercel, `.env.example` có placeholder; chạy local không cần Google (nút ẩn); giao diện tiếng Việt, 360px. | ✅ PASS |
| **Quy trình** | Thay đổi lược đồ + xác thực → rà soát riêng theo II và V trước khi merge. | ✅ ghi nhận |

**Re-check sau Phase 1**: data model (CHECK một cách đăng nhập, bảng chờ có hạn), contract (mọi lỗi luồng
chuyển hướng → `/login?error=…`; `410 GONE` cho bước tên hết hạn) và quickstart không thêm thành phần ngoài bảng
trên → ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-google-login/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
drizzle/0003_google_login.sql                 # mới (drizzle-kit generate)
.env.example · docs/DEPLOY.md                 # thêm GOOGLE_CLIENT_ID/SECRET + đăng ký redirect URI
src/
├── server/
│   ├── env.ts                                # + getGoogleConfig() (tùy chọn, không throw)
│   ├── db/schema.ts                          # users sửa; + pendingGoogleSignups
│   ├── domain/google-identity.ts             # mới, thuần: checkGoogleClaims, suggestDisplayName, PKCE helpers
│   ├── services/
│   │   ├── google-oauth.ts                   # mới: GoogleOAuthClient (fetch thật) + set/get client (cho test)
│   │   ├── google-login.ts                   # mới: startUrl, handleCallback, pending signup, completeSignup
│   │   ├── auth.ts                           # tách insertUser() dùng chung; authenticate() chịu password_hash null
│   │   ├── sessions.ts                       # SessionUser.username nullable, + googleEmail
│   │   └── cleanup.ts                        # + xóa pending_google_signups hết hạn
│   └── http/schemas.ts                       # + GoogleCompleteBody (dùng lại displayName schema)
├── lib/messages.ts                           # + thông báo google_* và mã GONE
├── app/
│   ├── api/auth/google/start/route.ts        # mới
│   ├── api/auth/google/callback/route.ts     # mới
│   ├── api/auth/google/complete/route.ts     # mới
│   ├── api/me/route.ts                       # + googleEmail
│   ├── login/page.tsx · LoginForm.tsx        # nút Google, thông báo ?error=
│   ├── login/google/page.tsx · GoogleSignupForm.tsx   # mới: bước tên hiển thị
│   └── (app)/friends/page.tsx                # dòng "đăng nhập bằng Google (email)" thay cho username
└── components/ui/icons.tsx                   # + GoogleIcon
tests/
├── unit/google-identity.test.ts              # mới
├── integration/google-login.test.ts          # mới
├── integration/migration-0003.test.ts        # mới
└── helpers/fake-google.ts                    # mới
```

**Structure Decision**: Giữ cấu trúc một project Next.js của 001 — logic thuần trong `src/server/domain`, nghiệp vụ
trong `src/server/services`, Route Handler mỏng trong `src/app/api`, test trong `tests/unit` và `tests/integration`.

## Complexity Tracking

Không có vi phạm cần biện minh.
