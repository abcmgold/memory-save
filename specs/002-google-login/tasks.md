---
description: "Task list — Đăng nhập bằng Google (002-google-login)"
---

# Tasks: Đăng nhập bằng Google

**Input**: Design documents from `/specs/002-google-login/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Bắt buộc theo Constitution III (logic xác thực/quyền phải có test, gồm cả ca bị từ chối) và V (migration
không phá dữ liệu). Viết test trước phần cài đặt tương ứng và xác nhận test đỏ trước khi làm cho xanh.

**Organization**: Theo user story của spec (US1, US2 đều P1). Không có US3 (liên kết đã bỏ ở spec rev 2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1 / US2
- Cấu trúc: một project Next.js — `src/`, `tests/`, `drizzle/` ở gốc repo (plan.md › Project Structure)

---

## Phase 1: Setup

**Purpose**: Cấu hình tùy chọn và tài liệu vận hành (không thêm dependency — research R1)

- [X] T001 [P] Thêm `GOOGLE_CLIENT_ID=` và `GOOGLE_CLIENT_SECRET=` (để trống, có chú thích: tùy chọn, thiếu thì ẩn nút
  Google; redirect URI `<origin>/api/auth/google/callback`) vào `.env.example`
- [X] T002 [P] Thêm mục "Đăng nhập bằng Google" vào `docs/DEPLOY.md`: tạo OAuth client (Web), đăng ký redirect URI cho
  localhost và domain Vercel (preview deploy không chạy nếu chưa đăng ký), đặt biến môi trường trên Vercel — theo
  quickstart.md › Chuẩn bị
- [X] T003 [P] Thêm `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` dạng `.optional()` vào `EnvSchema` và hàm
  `getGoogleConfig(): { clientId, clientSecret } | null` (đọc `process.env`, không throw; null khi thiếu một trong hai)
  trong `src/server/env.ts` (research R7)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lược đồ, migration, tách hàm tạo user, nới kiểu `username` — cả US1 và US2 đều cần

**⚠️ CRITICAL**: Chưa xong phase này thì chưa làm user story

### Tests (viết trước, phải đỏ)

- [X] T004 [P] Viết `tests/integration/migration-0003.test.ts` theo mẫu `tests/integration/migration-0001.test.ts`:
  áp migration 0000–0002, chèn user mật khẩu cũ, áp 0003; kiểm tra user cũ còn nguyên (username, password_hash,
  handle, display_name); chèn user Google (username/password_hash null, google_sub có) thành công; chèn dòng vi phạm
  `users_one_login_method` (không có cách đăng nhập nào; hoặc có cả username lẫn google_sub) bị từ chối; google_sub
  trùng bị từ chối — theo data-model.md › users.username, users.password_hash, users.google_sub, users.google_email
- [X] T005 [P] Thêm test vào `tests/integration/auth.test.ts`: user Google (không username) không đăng nhập được qua
  `POST /api/auth/login` (401 `INVALID_CREDENTIALS`); đăng ký/đăng nhập mật khẩu vẫn chạy như cũ (FR-G10, FR-G11)

### Implementation

- [X] T006 Sửa `users` và thêm bảng `pendingGoogleSignups` trong `src/server/db/schema.ts` theo data-model.md ›
  users.username, users.password_hash, users.google_sub, users.google_email (gồm CHECK `users_one_login_method`,
  `users_google_email_length`, UNIQUE `google_sub`) và data-model.md › pending_google_signups.token_hash,
  .google_sub, .google_email, .suggested_name, .next, .expires_at, .created_at (+ index
  `pending_google_signups_expires_idx`); export type `PendingGoogleSignupRow`
- [X] T007 Sinh migration bằng `npx drizzle-kit generate --name google_login` → `drizzle/0003_google_login.sql` (+ meta);
  đọc lại SQL, xác nhận chỉ có DROP NOT NULL / ADD COLUMN / ADD CONSTRAINT / CREATE TABLE / CREATE INDEX (không phá
  dữ liệu — Constitution V); chạy T004 cho xanh
- [X] T008 Tách hàm `insertUser(values)` (cấp handle `<base>.<4–6 số>`, invite token, thử lại khi trùng
  `users_handle_unique`/`users_invite_token_unique`, ném lại mọi lỗi khác) từ `registerUser` trong
  `src/server/services/auth.ts`; `registerUser` dùng lại nó và vẫn map `users_username_unique` → 409. Trong
  `authenticate()` coi `password_hash` null như không tìm thấy (vẫn verify hash giả để giữ thời gian đều)
- [X] T009 Trong `src/server/services/sessions.ts`: `SessionUser.username: string | null`, thêm
  `googleEmail: string | null` (select từ data-model.md › users.google_email); cập nhật mọi chỗ dùng
  `user.username` cho đúng kiểu (`src/app/api/me/route.ts` trả thêm `googleEmail` — contracts/api.md › Thay đổi
  endpoint cũ); chạy T005 cho xanh
- [X] T010 Thêm việc xóa dòng `pending_google_signups` có `expires_at < now()` vào `runCleanup()` trong
  `src/server/services/cleanup.ts` và thêm số lượng vào kết quả trả về; bổ sung một ca vào
  `tests/integration/cleanup.test.ts`
- [X] T011 Kiểm tra `npm test` và `npm run typecheck` xanh

**Checkpoint**: DB nhận được tài khoản Google; mọi chức năng cũ không đổi

---

## Phase 3: User Story 1 — Người mới vào app bằng Google (Priority: P1) 🎯 MVP

**Goal**: Bấm "Tiếp tục với Google" → (người mới) xác nhận tên hiển thị → có tài khoản và đăng nhập; lần sau vào thẳng.

**Independent Test**: quickstart.md kịch bản 1–5, 7, 8, 10, 11.

### Tests for User Story 1 (viết trước, phải đỏ)

- [X] T012 [P] [US1] Viết `tests/unit/google-identity.test.ts` cho `checkGoogleClaims` (hợp lệ; sai `iss`; sai `aud`;
  hết hạn và lệch giờ 60 giây; thiếu `sub`; thiếu email; `email_verified` false hoặc chuỗi "false" → "unverified"),
  `suggestDisplayName` (trim, gộp khoảng trắng, > 50 ký tự cắt còn 50 không vỡ ký tự tiếng Việt có dấu, rỗng → "")
  và PKCE (`codeChallenge(verifier)` khớp vector mẫu RFC 7636 phụ lục B) — theo research R2, data-model.md › Quy tắc
  kiểm tra
- [X] T013 [P] [US1] Tạo `tests/helpers/fake-google.ts`: `GoogleOAuthClient` giả, cấu hình được claims trả về hoặc ném
  lỗi, ghi lại `code`/`verifier`/`redirectUri` đã nhận; helper đọc `Set-Cookie` và trích `Location`
- [X] T014 [US1] Viết `tests/integration/google-login.test.ts` (dùng T013, `tests/helpers/request.ts`, đặt env Google
  giả trong test) cho các ca của contracts/api.md:
  - start: chưa cấu hình → 302 `/login`; có cấu hình → 302 tới Google với `state`, `code_challenge`, `redirect_uri`
    đúng origin, cookie `ms_oauth` HttpOnly/SameSite=Lax/Max-Age=600
  - callback bị từ chối: `error=access_denied` → `google_cancelled`; thiếu cookie, `state` sai, thiếu `code`, client
    ném lỗi → `google_failed`; email chưa xác minh → `google_unverified`; mọi ca đều không tạo user/phiên và xóa `ms_oauth`
  - callback người mới → 302 `/login/google`, có dòng pending, cookie `ms_gsignup`, chưa có user
  - complete: tên trống → 400 `fields.displayName`; không cookie / cookie lạ / dòng hết hạn → 410 `GONE`; hợp lệ → 201,
    user có `display_name` đã nhập, handle sinh từ tên, `google_email` lưu, `username` null, cookie `ms_session` dùng
    được với `GET /api/me` (trả `googleEmail`), dòng pending bị xóa; gửi lại lần hai → 410; hai dòng pending cùng
    `google_sub` hoàn tất lần lượt → chỉ một user, lần sau 200 vào đúng user đó (SC-003); thiếu `Origin` → 403
  - callback người cũ → 302 `/`, có `ms_session`, không qua pending
  - quyền riêng tư: bạn của user Google gọi `GET /api/friends` và xem bài được chia sẻ → không có `googleEmail`/email
    trong JSON (FR-G09, SC-004)

### Implementation for User Story 1

- [X] T015 [P] [US1] Tạo `src/server/domain/google-identity.ts` (thuần, không import server-only): `checkGoogleClaims`,
  `decodeJwtPayload` (base64url, không verify chữ ký — research R2), `suggestDisplayName` (≤ `MAX_DISPLAY_NAME`, theo
  data-model.md › users.display_name ở 001), `randomUrlToken(bytes)`, `codeChallenge(verifier)` (S256); chạy T012 cho xanh
- [X] T016 [P] [US1] Tạo `src/server/services/google-oauth.ts`: interface `GoogleOAuthClient { exchangeCode(code,
  verifier, redirectUri): Promise<unknown /* claims */> }`; bản thật POST form tới `https://oauth2.googleapis.com/token`
  (client_id, client_secret, code, code_verifier, grant_type, redirect_uri), lỗi HTTP → throw, trả payload `id_token`
  đã decode; `authorizeUrl({ clientId, redirectUri, state, challenge })` (scope `openid email profile`,
  `prompt=select_account`); `getGoogleClient()` / `setGoogleClientForTests()` theo mẫu `getPhotoStore`
- [X] T017 [P] [US1] Thêm vào `src/lib/messages.ts`: mã lỗi `GONE`; thông báo `googleCancelled`, `googleFailed`,
  `googleUnverified`, `googleExpired`, nhãn nút "Tiếp tục với Google"; thêm `errors.gone(message)` (410) vào
  `src/server/http/errors.ts`; thêm `GoogleCompleteBody` (chỉ `displayName`, dùng lại schema displayName của
  `RegisterBody`) vào `src/server/http/schemas.ts`
- [X] T018 [US1] Tạo `src/server/services/google-login.ts` (phụ thuộc T006–T009, T015–T017):
  - `buildStart(req, next)` → `{ location, cookie }` (cookie `ms_oauth` chứa `{state, verifier, next}` — research R3)
  - `handleCallback(req)` → `{ location, cookies[] }`: so `state` bằng `timingSafeEqual`, đổi mã, `checkGoogleClaims`,
    tra data-model.md › users.google_sub; có → `createSession`; chưa → insert pending (token băm SHA-256, `expires_at` +10
    phút, `next` đã qua `safeNext`) + cookie `ms_gsignup`; mọi lỗi → `/login?error=…` (research R9), luôn xóa `ms_oauth`
  - `getPendingSignup(token)` cho trang `/login/google` (null nếu không có/hết hạn)
  - `completeSignup(token, displayName)`: trong một transaction đọc + xóa dòng pending còn hạn, `insertUser({
    googleSub, googleEmail, displayName })`; vi phạm `users_google_sub_unique` → lấy user đã có (research R5); không
    có dòng → `errors.gone`
  - Hàm tạo/xóa cookie (`Secure` khi `isHttps`) và `redirectUri(req)` dùng chung logic origin với `requestOrigin()`
- [X] T019 [P] [US1] Tạo `src/app/api/auth/google/start/route.ts` (GET, `runtime = "nodejs"`): chưa cấu hình → 302
  `/login`; ngược lại 302 + `Set-Cookie` từ `buildStart`; `Cache-Control: no-store`
- [X] T020 [P] [US1] Tạo `src/app/api/auth/google/callback/route.ts` (GET): gọi `handleCallback`, trả 302 với nhiều
  `Set-Cookie` (dùng `Headers.append`)
- [X] T021 [P] [US1] Tạo `src/app/api/auth/google/complete/route.ts` (POST, bọc `route()` để kiểm Origin): parse
  `GoogleCompleteBody`, đọc cookie `ms_gsignup`, `completeSignup`, `createSession`; trả `{ user, next }` 201 (hoặc 200
  khi vào user đã có) với `Set-Cookie` phiên + xóa `ms_gsignup`; chạy T014 cho xanh
- [X] T022 [P] [US1] Thêm `GoogleIcon` (logo "G" bốn màu chính thức, SVG nội tuyến) vào `src/components/ui/icons.tsx`
- [X] T023 [US1] Sửa `src/app/login/page.tsx` + `src/app/login/LoginForm.tsx`: nhận `googleEnabled` (từ
  `getGoogleConfig() !== null`) và `searchParams.error`; hiện thông báo tiếng Việt cho 4 mã `google_*` (mã khác bỏ qua)
  qua `FormError`; khi `googleEnabled` hiển thị dải "hoặc" + link `buttonClass("secondary","lg","shadow-brutal")` có
  `GoogleIcon` tới `/api/auth/google/start?next=<next>` ở cả hai tab (FR-G01, FR-G14)
- [X] T024 [US1] Tạo `src/app/login/google/page.tsx` (Server Component): đọc cookie `ms_gsignup` → `getPendingSignup`;
  không có → `redirect("/login?error=google_expired")`; đã đăng nhập → `redirect(next ?? "/")`; bố cục giống `/login`
  (logo, khung trắng `rounded-[20px] border-[2.5px] shadow-brutal-lg`), hiển thị email Google, dòng nhắc "Đã có tài
  khoản? Đăng nhập bằng tên đăng nhập và mật khẩu" → `/login` (contracts/api.md › Trang `/login/google`)
- [X] T025 [US1] Tạo `src/app/login/google/GoogleSignupForm.tsx` (client): `TextField` "Tên hiển thị" điền sẵn
  `suggestedName`, `maxLength=50`, `required`, gợi ý giống form đăng ký; nút "Bắt đầu"; `api("/api/auth/google/complete")`
  → `router.replace(next ?? "/")` + `refresh()`; lỗi `fields` hiện dưới ô; 410 → `router.replace("/login?error=google_expired")`
- [X] T026 [US1] Sửa `src/app/(app)/friends/page.tsx`: nếu `user.username` null thì hiện "Bạn đăng nhập bằng Google
  (<googleEmail>) — không ai khác thấy email này", ngược lại giữ câu tên đăng nhập cũ (FR-G09)

**Checkpoint**: US1 chạy độc lập — người mới và người cũ đăng nhập Google được; test US1 xanh

---

## Phase 4: User Story 2 — Nhận lời mời kết bạn bằng Google (Priority: P1)

**Goal**: `next` (vd `/add/<token>`) được giữ qua start → callback → bước tên → complete; không bao giờ chuyển ra ngoài.

**Independent Test**: quickstart.md kịch bản 6.

### Tests for User Story 2 (viết trước, phải đỏ)

- [X] T027 [US2] Thêm vào `tests/integration/google-login.test.ts`: (a) start với `next=/add/<token>` → người mới
  complete trả `next = "/add/<token>"`, rồi gọi `POST /api/invites/<token>/accept` bằng phiên mới → hai người là bạn;
  (b) người cũ callback → `Location: /add/<token>`; (c) `next` là `//evil.com`, `https://evil.com`, `/\evil.com` → bị
  bỏ, về `/`; (d) `cancel` vẫn giữ `next` trong `/login?error=google_cancelled&next=…` (FR-G08, SC-002)

### Implementation for User Story 2

- [X] T028 [US2] Đảm bảo `next` đi qua `safeNext()` cả khi ghi cookie `ms_oauth`, khi đọc lại ở callback, khi lưu vào
  data-model.md › pending_google_signups.next và khi trả từ complete, trong `src/server/services/google-login.ts`;
  ca `google_cancelled` kèm `&next=` để quay lại vẫn còn lời mời; chạy T027 cho xanh
- [X] T029 [US2] Trong `src/app/add/[token]/page.tsx`: khi `login_required` và Google đã cấu hình, thêm nút "Tiếp tục với
  Google" (`GoogleIcon`, `/api/auth/google/start?next=/add/<token>`) cạnh các nút hiện có

**Checkpoint**: US1 + US2 đều chạy; luồng mời kết bạn không mất khi dùng Google

---

## Phase 5: Polish & Cross-Cutting

- [X] T030 [P] Cập nhật `README.md` (mục chạy local: Google là tùy chọn, cách bật) và `specs/001-daily-journal/
  data-model.md` (ghi chú users đã mở rộng ở 002)
- [X] T031 Rà soát riêng theo Constitution II và V (thay đổi xác thực + lược đồ): không log `code`/token/email; cookie
  đều HttpOnly + SameSite=Lax + Secure trên HTTPS; `google_email` không có trong bất kỳ `UserRef`/phản hồi cho người khác
  (grep `googleEmail` trong `src/`)
- [X] T032 Chạy `npm test`, `npm run typecheck`, `npm run lint` — tất cả xanh
- [ ] T033 Chạy thủ công quickstart.md (cần OAuth client thật trong `.env.local`) ở 360px và desktop; ghi kết quả

---

## Dependencies & Execution Order

- **Phase 1** → không phụ thuộc; T001–T003 song song.
- **Phase 2** phụ thuộc T003 (không bắt buộc) và chặn mọi user story. Thứ tự: T004, T005 (test) → T006 → T007 → T008,
  T009 → T010 → T011.
- **US1 (Phase 3)** phụ thuộc Phase 2. Trong phase: T012, T013 → T014; T015, T016, T017 song song → T018 → T019–T022
  song song → T023 → T024 → T025 → T026.
- **US2 (Phase 4)** phụ thuộc T018 (luồng Google) — về mặt logic là phần mở rộng của US1 cho tham số `next`.
- **Polish** sau khi US1 + US2 xong.

```text
Setup ─► Foundational ─► US1 (MVP) ─► US2 ─► Polish
```

## Parallel Examples

```text
# Phase 1
T001 .env.example  |  T002 docs/DEPLOY.md  |  T003 src/server/env.ts

# Phase 2 (test trước)
T004 migration-0003.test.ts  |  T005 auth.test.ts

# US1 — test
T012 google-identity.test.ts  |  T013 fake-google.ts

# US1 — nền
T015 domain/google-identity.ts  |  T016 services/google-oauth.ts  |  T017 messages/errors/schemas

# US1 — route + icon (sau T018)
T019 start  |  T020 callback  |  T021 complete  |  T022 GoogleIcon
```

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US1**: đủ để người mới đăng ký/đăng nhập bằng Google; dừng lại test bằng quickstart 1–5.
2. **+ US2**: bảo toàn luồng mời kết bạn — nên làm ngay sau MVP trước khi deploy, vì link mời là đường vào chính.
3. **Polish**: rà soát bảo mật/riêng tư, chạy toàn bộ test và quickstart rồi mới merge.
