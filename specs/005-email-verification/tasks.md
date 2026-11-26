---

description: "Task list for 005 Email xác thực bằng OTP, đăng nhập Google theo email, quên mật khẩu"
---

# Tasks: Email xác thực bằng OTP, đăng nhập Google theo email, quên mật khẩu

**Input**: Design documents from `/specs/005-email-verification/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: BẮT BUỘC theo Constitution III — logic xác thực/phân quyền phải có test, gồm cả ca bị từ chối. Test viết trước
và phải đỏ trước khi viết code tương ứng.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1 đăng ký có email · US2 Google theo email · US3 quên mật khẩu · US4 thêm email ở /me

---

## Phase 1: Setup

- [X] T001 Cài `nodemailer@10.6.1` và `@types/nodemailer` (dev) vào `package.json` (research R1)
- [X] T002 [P] Thêm `SMTP_USER=`, `SMTP_PASS=`, `MAIL_FROM_NAME=`, `MAIL_TRANSPORT=` (để trống, chú thích: tuỳ chọn;
  thiếu thì các luồng gửi mã báo không khả dụng; local mặc định ghi thư ra log) vào `.env.example`
- [X] T003 [P] Thêm `getMailConfig(): { user, pass, fromName } | null` (đọc `process.env`, không throw) và
  `mailTransport(): "smtp" | "log" | null` (test hoặc `isLocalMode()` mà `MAIL_TRANSPORT !== "smtp"` → `"log"`; có cấu hình →
  `"smtp"`; còn lại `null`) vào `src/server/env.ts` (research R1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: lược đồ, mã xác thực, gửi thư — mọi user story đều dùng.

### Tests (viết trước, phải đỏ)

- [X] T004 [P] Viết `tests/unit/email-code.test.ts` cho `src/server/domain/email-code.ts`: `normalizeEmail` (khoảng trắng,
  chữ hoa); `isValidEmail` (hợp lệ, thiếu @, > 254 ký tự — data-model.md › users.email); `newCode()` luôn 6 chữ số kể cả số 0
  đầu; `codeHash(ticket, code)` khác nhau khi ticket khác; `sameHash` so sánh constant-time; `resendWaitSeconds(sentAt, now)`
  (0 khi ≥ 60 giây); `maskEmail("an@gmail.com")`
- [X] T005 [P] Viết `tests/unit/mail-templates.test.ts` cho `src/server/mail/templates.ts`: thư mã cho từng mục đích có mã
  trong tiêu đề và thân, có "10 phút", không có `http`; thư "đã có tài khoản" và thư "tài khoản Google" không chứa chuỗi
  6 chữ số nào; tiếng Việt có dấu
- [X] T006 [P] Viết `tests/integration/migration-0004.test.ts` theo mẫu `tests/integration/migration-0003.test.ts`: dựng DB tới
  `0003`, chèn user mật khẩu + user Google có `google_email = ' An@Gmail.com '`, chạy `0004` → user Google có
  `email = 'an@gmail.com'` và `email_verified_at = created_at`; user mật khẩu có `email` null và vẫn đăng nhập được; CHECK mới
  từ chối user không có cách đăng nhập nào, user có `username` mà không có `password_hash`, `email` không có
  `email_verified_at`; chỉ mục duy nhất từ chối hai user cùng email
- [X] T007 [P] Viết `tests/integration/email-codes.test.ts` cho service `src/server/services/email-codes.ts` (dùng
  `MemoryMailer`): issue → thư chứa mã, `consume` đúng mã → trả dòng và xoá; sai mã → `CODE_INVALID` với `attemptsLeft` 4…1,
  lần thứ 5 → `GONE` và dòng bị xoá; hết hạn → `GONE`; sai mục đích → `GONE`; dùng lại mã đã dùng → `GONE`; resend trước 60 giây
  → 429 kèm `retryAfter`, sau 60 giây → mã cũ hết hiệu lực, mã mới dùng được; 6 lần gửi cùng email trong 1 giờ → lần 6 bị 429;
  21 lần cùng IP → 429; mailer ném lỗi → `MAIL_FAILED`, không ghi `email_sends`, dòng mã bị xoá; mailer `null` →
  `MAIL_UNAVAILABLE`; "mã ngầm" (decoy) không bao giờ khớp

### Implementation

- [X] T008 Sửa `src/server/db/schema.ts` theo data-model.md: `users.email` (đổi từ `googleEmail`, data-model.md ›
  users.email), `users.emailVerifiedAt` (data-model.md › users.email_verified_at), CHECK `users_login_method` (data-model.md ›
  users.username, users.password_hash), bỏ `users_one_login_method`/`users_google_email_length`; thêm bảng `emailCodes`
  (data-model.md › email_codes.ticket_hash, .purpose, .email, .user_id, .code_hash, .payload, .attempts, .sent_at,
  .expires_at) và `emailSends` (data-model.md › email_sends.email, .ip, .sent_at) kèm chỉ mục
- [X] T009 Sinh `drizzle/0004_email_verification.sql` bằng `npx drizzle-kit generate --name email_verification`; sửa tay để
  thứ tự là: đổi tên cột → thêm `email_verified_at` → `UPDATE users SET email = lower(btrim(email)), email_verified_at =
  created_at WHERE email IS NOT NULL` → CHECK/chỉ mục mới (research R9); đảm bảo `RENAME COLUMN` (không drop + add)
- [X] T010 [P] Tạo `src/server/domain/email-code.ts` (thuần): `normalizeEmail`, `isValidEmail`, `MAX_EMAIL = 254`,
  `CODE_TTL_SEC = 600`, `RESEND_AFTER_SEC = 60`, `MAX_ATTEMPTS = 5`, `SENDS_PER_EMAIL_HOUR = 5`, `SENDS_PER_IP_HOUR = 20`,
  `newTicket`, `newCode`, `ticketHash`, `codeHash`, `sameHash`, `resendWaitSeconds`, `maskEmail` (research R2, R3)
- [X] T011 [P] Tạo `src/server/mail/templates.ts` (thuần): `codeMail(purpose, code)`, `emailTakenMail()`,
  `googleAccountMail()` → `{ subject, text, html }` theo contracts/api.md › Thư
- [X] T012 [P] Tạo `src/server/mail/mailer.ts`: interface `Mailer`, `SmtpMailer` (nodemailer, `smtp.gmail.com:465`,
  `secure: true`, transporter lazy), `LogMailer` (`console.info("[mail] to=… subject=…\n" + text)`), `getMailer()` theo
  `mailTransport()`, `setMailerForTests()` (research R1)
- [X] T013 [P] Tạo `tests/helpers/memory-mailer.ts`: `MemoryMailer` lưu thư đã gửi, `lastCodeFor(email)`, `fail = true` để
  giả lỗi; đăng ký mặc định trong `tests/helpers/setup-env.ts` và reset sau mỗi test
- [X] T014 [P] Thêm vào `src/lib/messages.ts`: mã lỗi `CODE_INVALID`, `MAIL_UNAVAILABLE`, `MAIL_FAILED`; thông báo
  `emailInvalid`, `emailSameAsCurrent`, `emailUnavailable`, `codeInvalid(n)`, `codeExpired`, `codeWait(s)`, `tooManyCodes`,
  `mailUnavailable`, `mailFailed`, `emailCardWarning`; thêm `google_conflict` vào `GOOGLE_LOGIN_ERRORS`
- [X] T015 Thêm `errors.codeInvalid(attemptsLeft)` (422), `errors.mailUnavailable()` (503), `errors.mailFailed()` (502) và
  `retryAfter` cho `rateLimited` trong `src/server/http/errors.ts`; `errorResponse` trả thêm `attemptsLeft` / `retryAfter`
- [X] T016 [P] Thêm `clientIp(req)` (giá trị đầu của `x-forwarded-for`, mặc định `"unknown"`) vào `src/server/http/request.ts`
- [X] T017 Tạo `src/server/services/email-codes.ts` (phụ thuộc T008–T016): `issueCode({ purpose, email, userId?, payload?,
  ip, decoy?, mail })` (kiểm giới hạn → xoá dòng cũ cùng bộ khoá → chèn → gửi → ghi `email_sends`; lỗi gửi → xoá dòng, ném
  `MAIL_FAILED`); `resendCode(ticket, ip, sessionUserId?)`; `consumeCode(tx, { ticket, code, purpose, userId? })` (tăng
  `attempts` nguyên tử trước khi so sánh; sai lần 5 → xoá + `GONE`); `deleteExpiredCodes()`, `deleteOldSends()` (research R2–R4)
- [X] T018 Đổi `SessionUser.googleEmail` → `email` và thêm `deleteUserSessions(userId, tx?)` trong
  `src/server/services/sessions.ts`; sửa mọi nơi dùng `googleEmail` (`src/app/api/me/route.ts`, `src/server/services/google-login.ts`,
  tests)
- [X] T019 Thêm xoá `email_codes` hết hạn và `email_sends` > 1 giờ vào `runCleanup()` trong `src/server/services/cleanup.ts`;
  bổ sung `tests/integration/cleanup.test.ts`
- [X] T020 Kiểm tra `npm test` (T004–T007 xanh) và `npm run typecheck`

**Checkpoint**: nền xong — các user story bắt đầu được.

---

## Phase 3: User Story 1 — Đăng ký có email đã xác thực (Priority: P1) 🎯 MVP

**Goal**: đăng ký bằng tên đăng nhập chỉ tạo tài khoản sau khi nhập đúng mã gửi tới email.

**Independent Test**: quickstart.md › Thủ công 1–2.

### Tests for User Story 1 (viết trước, phải đỏ)

- [X] T021 [US1] Viết `tests/integration/email-signup.test.ts`: `register/start` hợp lệ → 202 `{ticket, resendIn, expiresIn}`,
  chưa có user; `verify` đúng mã → 201, cookie phiên, user có `email` chuẩn hoá + `email_verified_at`, `next` an toàn được giữ,
  `next` ra ngoài bị bỏ; sai định dạng từng ô → 400 `fields`; username đã có → 409, không gửi thư; email đã có tài khoản → 202
  y hệt, thư là `emailTakenMail`, mọi mã → `CODE_INVALID`; hai người cùng email đều nhập đúng mã → một 201, một 409; bản ghi
  chờ không chứa mật khẩu thô; `POST /api/auth/register` cũ không còn (404/405)
- [X] T022 [US1] Sửa `tests/integration/auth.test.ts`, `tests/integration/username-privacy.test.ts` và
  `tests/helpers/factories.ts` để tạo user qua service mới hoặc `insertUser` thay cho `registerUser`/route cũ

### Implementation for User Story 1

- [X] T023 [P] [US1] Thêm `SignupStartBody` (dùng lại `RegisterBody` + `email` + `next`) và `CodeVerifyBody` (`ticket`
  1–100 ký tự, `code` đúng 6 chữ số) vào `src/server/http/schemas.ts`; xoá `RegisterBody` nếu không còn dùng
- [X] T024 [US1] Tạo `src/server/services/email-signup.ts`: `startSignup(input, ip)` (username trùng → 409; băm Argon2id;
  email đã thuộc user khác → `issueCode` dạng decoy với `emailTakenMail`, ngược lại `codeMail("signup")`; payload theo
  data-model.md › email_codes.payload) và `verifySignup(ticket, code)` (transaction: `consumeCode` + `insertUser` với
  data-model.md › users.email, users.email_verified_at; bắt `users_username_unique`/`users_email_unique` → 409) (research R5)
- [X] T025 [US1] Xoá `registerUser` khỏi `src/server/services/auth.ts` và xoá `src/app/api/auth/register/route.ts`
- [X] T026 [P] [US1] Tạo `src/app/api/auth/register/start/route.ts` (POST, `runtime = "nodejs"`, `route()`): parse → `startSignup`
  → 202
- [X] T027 [P] [US1] Tạo `src/app/api/auth/register/verify/route.ts`: parse → `verifySignup` → `createSession` → 201
  `{ user, next }` + `Set-Cookie`
- [X] T028 [P] [US1] Tạo `src/app/api/auth/codes/resend/route.ts`: parse `{ticket}` → `resendCode(ticket, clientIp(req),
  sessionUserId)` → 202
- [X] T029 [P] [US1] Tạo `src/components/auth/CodeStep.tsx` (client): ô 6 số `inputMode="numeric"`
  `autoComplete="one-time-code"`, dòng "Đã gửi mã tới {maskEmail} — kiểm tra cả thư mục Spam", nút "Gửi lại" đếm ngược từ
  `resendIn`/`retryAfter`, hiển thị `attemptsLeft`, khi `GONE` chuyển sang trạng thái "gửi mã mới", liên kết "Đổi email";
  prop `extraFields` để US3 thêm ô mật khẩu mới (research R10)
- [X] T030 [US1] Sửa `src/app/login/LoginForm.tsx`: chế độ Đăng ký thêm ô Email (`type="email"`, `autoComplete="email"`), nút
  "Gửi mã" gọi `register/start` (gửi kèm `next`) → hiển thị `CodeStep` → `register/verify` → `router.replace(next ??
  HOME_PATH)`; quay lại form giữ nguyên dữ liệu đã nhập
- [X] T031 [US1] Chạy `npm test` — T021, T022 xanh

**Checkpoint**: US1 dùng được độc lập (MVP).

---

## Phase 4: User Story 2 — Đăng nhập Google vào tài khoản cùng email (Priority: P1)

**Goal**: Google khớp email đã xác thực → vào tài khoản cũ; hai cách đăng nhập cùng tồn tại.

**Independent Test**: quickstart.md › Thủ công 5 (production) + test tự động.

### Tests for User Story 2 (viết trước, phải đỏ)

- [X] T032 [US2] Bổ sung `tests/integration/google-login.test.ts`: user mật khẩu có email đã xác thực X, Google X (chữ hoa
  khác) → vào đúng user đó, `google_sub` được gắn, không qua `/login/google`, sau đó vẫn đăng nhập mật khẩu được; user có
  email X nhưng đã gắn sub khác → `/login?error=google_conflict`, không gắn; Google `email_verified=false` → từ chối, không gắn;
  user không có email nhưng `username` trùng phần trước @ → không khớp, đi luồng tạo mới; user đã gắn sub đăng nhập Google với
  email Google khác email tài khoản → vào, `email` tài khoản không đổi; tạo mới qua `complete` → `email` chuẩn hoá +
  `email_verified_at`; `complete` khi email vừa bị user khác xác thực → 409; luồng `/add/...` giữ `next`

### Implementation for User Story 2

- [X] T033 [US2] Sửa `handleCallback` trong `src/server/services/google-login.ts` theo research R8: bỏ cập nhật email theo
  Google; thêm bước khớp `users.email = normalizeEmail(email)` (data-model.md › users.google_sub) với `UPDATE … WHERE
  google_sub IS NULL` và đọc lại khi tranh chấp; sub khác → `google_conflict`
- [X] T034 [US2] Sửa `completeSignup` trong `src/server/services/google-login.ts`: chèn `email` chuẩn hoá +
  `emailVerifiedAt` (data-model.md › users.email, users.email_verified_at); vi phạm `users_email_unique` → `errors.conflict`
  với thông báo của contracts/api.md; hiển thị lỗi 409 trong `src/app/login/google/GoogleSignupForm.tsx`
- [X] T035 [US2] Chạy `npm test` — T032 xanh

---

## Phase 5: User Story 3 — Quên mật khẩu (Priority: P2)

**Goal**: lấy lại mật khẩu bằng mã gửi tới email đã xác thực; huỷ mọi phiên cũ.

**Independent Test**: quickstart.md › Thủ công 3.

### Tests for User Story 3 (viết trước, phải đỏ)

- [X] T036 [US3] Viết `tests/integration/password-reset.test.ts`: email của user mật khẩu → 202, thư có mã; email không tồn tại
  → 202 y hệt, không có thư; email của user chỉ dùng Google → 202, thư `googleAccountMail`, mọi mã sai; `verify` đúng mã + mật
  khẩu hợp lệ → 200, cookie mới, mọi phiên cũ bị xoá (phiên cũ → 401), mật khẩu cũ không đăng nhập được, mật khẩu mới được,
  `login_attempts` của user bị xoá; mật khẩu quá ngắn → 400 và không tính lượt sai; sai mã/hết hạn/dùng lại → 422/410 và mật
  khẩu không đổi; mã `signup` không dùng được để reset

### Implementation for User Story 3

- [X] T037 [P] [US3] Thêm `ResetStartBody` (`email`) và `ResetVerifyBody` (`ticket`, `code`, `password` cùng quy tắc đăng ký)
  vào `src/server/http/schemas.ts`
- [X] T038 [US3] Tạo `src/server/services/password-reset.ts`: `startReset(email, ip)` (kiểm giới hạn đồng bộ; tạo ticket; gửi
  thư trong `after()` của `next/server` theo 3 trường hợp research R4) và `verifyReset(ticket, code, password)` (transaction:
  `consumeCode` + cập nhật `password_hash` + `deleteUserSessions` + xoá `login_attempts`) (research R6)
- [X] T039 [P] [US3] Tạo `src/app/api/auth/password-reset/start/route.ts` và `src/app/api/auth/password-reset/verify/route.ts`
  (verify → `createSession` → 200 + `Set-Cookie`)
- [X] T040 [P] [US3] Tạo `src/app/forgot-password/page.tsx` (metadata: title "Quên mật khẩu", `robots: noindex`, canonical) và
  `src/app/forgot-password/ForgotPasswordForm.tsx` (bước email → `CodeStep` với ô mật khẩu mới → `router.replace(HOME_PATH)`),
  phong cách giống `/login`
- [X] T041 [US3] Thêm liên kết "Quên mật khẩu?" dưới ô mật khẩu ở chế độ Đăng nhập trong `src/app/login/LoginForm.tsx`
- [X] T042 [US3] Chạy `npm test` — T036 xanh

---

## Phase 6: User Story 4 — Thêm / đổi email ở trang Cá nhân (Priority: P2)

**Goal**: tài khoản cũ thấy cảnh báo ở `/me` và thêm được email; chủ tài khoản xem và đổi email.

**Independent Test**: quickstart.md › Thủ công 4, 6.

### Tests for User Story 4 (viết trước, phải đỏ)

- [X] T043 [US4] Viết `tests/integration/me-email.test.ts`: chưa đăng nhập → 401 cho `start`/`verify`; thêm email → đúng mã →
  200, `/api/me` trả `email`; email trùng email hiện tại → 400; email của user khác → 202, thư `emailTakenMail`, mã luôn sai;
  user B dùng ticket của user A → 410; resend ticket `change_email` của A bằng phiên B → 410; email bị user khác xác thực trong
  lúc chờ → 409; đổi email: email cũ giữ tới khi xác thực xong; bạn bè gọi các API danh sách bạn/người xem/trang mời/OG không
  thấy `email` ở đâu (FR-E15)

### Implementation for User Story 4

- [X] T044 [P] [US4] Thêm `EmailStartBody` (`email`) vào `src/server/http/schemas.ts`
- [X] T045 [US4] Tạo `src/server/services/account-email.ts`: `startEmailChange(userId, email, ip)` và
  `verifyEmailChange(userId, ticket, code)` (cập nhật data-model.md › users.email, users.email_verified_at; bắt
  `users_email_unique` → 409) (research R7)
- [X] T046 [P] [US4] Tạo `src/app/api/me/email/start/route.ts` và `src/app/api/me/email/verify/route.ts` (yêu cầu phiên)
- [X] T047 [P] [US4] Tạo `src/components/profile/EmailCard.tsx` (client): chưa có email → khung cảnh báo nền butter
  (`msg.emailCardWarning`), ô email + "Gửi mã" → `CodeStep`; có email → dòng email + nút "Đổi"; xong → `router.refresh()`
- [X] T048 [US4] Gắn `EmailCard` vào `src/app/(app)/me/page.tsx` ngay dưới thẻ hồ sơ, truyền `user.email`
- [X] T049 [US4] Chạy `npm test` — T043 xanh

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T050 [P] Cập nhật `docs/DEPLOY.md`: mục Gmail SMTP (bật xác minh 2 bước, tạo App Password, đặt `SMTP_USER`/`SMTP_PASS`
  trên Vercel, thư có thể vào Spam), thêm vào checklist sau deploy; cập nhật `README.md` (tính năng email, `LogMailer` khi chạy
  local)
- [X] T051 [P] Cập nhật FAQ "Kết bạn…"/thêm câu về quên mật khẩu trong `src/lib/landing-content.ts` nếu cần cho đúng sự thật
  (chỉ khi nội dung hiện tại sai), và `STEPS[0]` nhắc email
- [X] T052 [P] Ghi chú vào `specs/002-google-login/spec.md` (dòng Status) rằng rev 2/rev 3 đã được thay bởi 005
- [X] T053 Rà soát riêng theo Nguyên tắc II và V (quy trình): grep log không in mã/ticket/email
  (`rg "console\.(log|info|warn)" src/server`), `UserRef` không có email, migration không phá dữ liệu
- [ ] T054 (test/typecheck/lint/build ✅ 2026-11-26; còn thử tay local — cần khởi động lại `npm run dev:local` để áp migration 0004) Chạy `npm test`, `npm run typecheck`, `npm run lint`, `npm run build:app`; chạy local theo quickstart.md › Thủ công
  1–4, 6 trên PGlite với `LogMailer`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (chặn mọi story) → US1 → US2 / US3 / US4.
- US2 chỉ phụ thuộc Phase 2 (cột `email`); có thể làm song song với US1 về mặt code, nhưng kiểm thủ công cần tài khoản có
  email (US1 hoặc US4).
- US3, US4 dùng `CodeStep` (T029) và route resend (T028) của US1.
- Trong mỗi story: test → schemas → service → route → UI → chạy test.
- Cùng file `src/server/http/schemas.ts` (T023, T037, T044) và `LoginForm.tsx` (T030, T041): làm tuần tự.

## Parallel Examples

- Phase 2: T004, T005, T006, T007 cùng lúc; sau T008–T009 thì T010–T016 cùng lúc.
- US1: T026, T027, T028, T029 cùng lúc sau T024.
- US3: T039 và T040 cùng lúc sau T038.
- US4: T046 và T047 cùng lúc sau T045.

## Implementation Strategy

1. **MVP**: Phase 1–3 (đăng ký có email). Có thể deploy riêng — Google vẫn chạy như 002 (cột đã đổi tên).
2. Thêm US2 → giá trị chính người dùng yêu cầu (đăng nhập Google vào tài khoản cũ).
3. Thêm US3, US4 → hoàn tất; Polish → deploy (cần `SMTP_USER`/`SMTP_PASS` trên Vercel **trước** khi push, nếu không đăng ký
   bằng tên đăng nhập sẽ báo không khả dụng).
