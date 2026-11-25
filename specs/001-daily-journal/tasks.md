---
description: "Task list for MemorySave (001-daily-journal)"
---

# Tasks: MemorySave — nhật ký hằng ngày & chia sẻ khoảnh khắc với bạn bè

**Input**: Design documents from `/specs/001-daily-journal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Có — constitution Nguyên tắc III yêu cầu test tự động cho phân quyền, chia sẻ, timeline, media;
SC-006 yêu cầu kiểm chứng tự động mọi truy cập trái phép. Test viết trước phần cài đặt trong mỗi story.

**Organization**: Theo user story (US1 P1 → US4 P4) để mỗi story chạy và kiểm thử độc lập.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1–US4 theo spec.md
- Đường dẫn theo cấu trúc một project Next.js ở gốc repo (plan.md › Project Structure)
- Ràng buộc trường dữ liệu: trích dẫn `data-model.md` › `Entity.field`; giao diện: bản thiết kế
  https://claude.ai/artifact/R54gKMFCQv1fsT3R8xAz9o (artboard nêu tên trong task)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Khởi tạo project và công cụ

- [X] T001 Khởi tạo Next.js (App Router, TypeScript strict, thư mục `src/`, Tailwind CSS v4, ESLint, import alias `@/*`) tại gốc repo, giữ nguyên `.claude/`, `.specify/`, `specs/`; chạy `git init`; tạo `.gitignore` gồm `node_modules`, `.next`, `.env*.local`, `backups/`, `.vercel` — file `package.json`, `tsconfig.json`, `.gitignore`
- [X] T002 Cài phụ thuộc theo plan.md › Technical Context: `drizzle-orm`, `@neondatabase/serverless`, `ws`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@node-rs/argon2`, `sharp`, `heic-convert`, `zod`; dev: `drizzle-kit`, `@electric-sql/pglite`, `vitest`, `@types/ws`, `tsx`; khai báo `serverExternalPackages: ['sharp','@node-rs/argon2','heic-convert']` trong `next.config.ts`
- [X] T003 [P] Tạo `vitest.config.ts` (môi trường node, alias `@/*`, thư mục `tests/`) và script trong `package.json`: `test`, `db:generate`, `db:migrate`, `build` (= `npm run db:migrate && next build`), `backup`, `restore`
- [X] T004 [P] Tạo `.env.example` với `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `APP_TIMEZONE=Asia/Ho_Chi_Minh`, `CRON_SECRET` (research.md R16)
- [X] T005 [P] Thiết lập token neo-brutalism trong `src/app/globals.css` (màu, viền 2px, bóng `2px 2px 0 #111`/`3px 3px 0 #111`, nền chấm — research.md R11) và `src/app/layout.tsx` (`lang="vi"`, Be Vietnam Pro qua `next/font/google` subset `vietnamese` weight 400–900, khung mobile tối đa 480px giữa màn hình)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB, kho ảnh, phiên đăng nhập, khung UI — mọi story cần

**⚠️ CRITICAL**: Chưa xong phase này thì chưa bắt đầu user story

- [X] T006 Tạo `src/server/env.ts` đọc và kiểm tra biến môi trường bằng zod (research.md R16), báo lỗi rõ khi thiếu
- [X] T007 Định nghĩa schema Drizzle cho toàn bộ bảng trong `src/server/db/schema.ts`, đúng kiểu/ràng buộc của data-model.md: `users.id`, `users.username`, `users.display_name`, `users.password_hash`, `users.last_audience`, `users.created_at`; `sessions.token_hash`, `sessions.user_id`, `sessions.expires_at`; `login_attempts.username`, `login_attempts.attempted_at`; `friend_requests.from_user_id`, `friend_requests.to_user_id` (PK + CHECK); `friendships.user_a_id`, `friendships.user_b_id` (CHECK a < b); `entries.title`, `entries.body`, `entries.event_at`, `entries.event_date` (generated), `entries.kind`, `entries.audience_mode` (CHECK), chỉ mục timeline; `photos.uploader_id`, `photos.entry_id`, `photos.status`, `photos.position`, `photos.format`, `photos.bytes`, `photos.width`, `photos.height`; `entry_audience.entry_id`, `entry_audience.user_id` (PK + index)
- [X] T008 Tạo `drizzle.config.ts`, sinh migration đầu tiên vào `drizzle/`, và `scripts/migrate.ts` áp migration lên `DATABASE_URL` (dùng cho `npm run db:migrate`)
- [X] T009 Tạo `src/server/db/client.ts`: Drizzle + `@neondatabase/serverless` Pool (WebSocket qua `ws`), xuất kiểu `Db` và cơ chế cho test thay DB (hàm `getDb()` / `setDbForTests()`) (research.md R3)
- [X] T010 [P] Tạo `tests/helpers/test-db.ts`: PGlite trong bộ nhớ, áp migration thật trong `drizzle/`, gắn vào `setDbForTests()`, reset giữa các test
- [X] T011 [P] Tạo interface `PhotoStore` (`presignPut`, `presignGet`, `head`, `get`, `put`, `delete`, `list`) trong `src/server/storage/photo-store.ts` và bản bộ nhớ `tests/helpers/memory-photo-store.ts`
- [X] T012 [P] Cài `R2PhotoStore` bằng AWS SDK S3 (endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`; presign PUT ký kèm `Content-Type` + `Content-Length`; presign GET hạn 60 giây) trong `src/server/storage/r2-photo-store.ts` (research.md R5, R6)
- [X] T013 [P] Tạo `src/lib/messages.ts`: mã lỗi và thông báo tiếng Việt theo bảng lỗi của contracts/api.md
- [X] T014 [P] Tạo tiện ích HTTP trong `src/server/http/`: `json-error.ts` (định dạng lỗi chuẩn của contracts/api.md, map ZodError → 400 `VALIDATION` kèm `fields`), `check-origin.ts` (403 `BAD_ORIGIN`)
- [X] T015 [P] Viết `src/server/domain/username.ts` (chuẩn hóa chữ thường, kiểm tra `data-model.md` › `users.username`) và test `tests/unit/username.test.ts`
- [X] T016 [P] Viết `src/server/domain/clock.ts` (giờ hiện tại theo `APP_TIMEZONE` dạng `YYYY-MM-DDTHH:mm`, cộng/trừ phút, đầu/cuối ngày) và test `tests/unit/clock.test.ts` (server chạy UTC vẫn ra đúng giờ Việt Nam)
- [X] T017 [P] Tạo `tests/helpers/factories.ts` (tạo user, phiên, bạn bè, bài, ảnh nhanh) và `tests/helpers/request.ts` (dựng `Request` có cookie phiên + `Origin` hợp lệ, gọi trực tiếp Route Handler)
- [X] T018 Viết test tích hợp `tests/integration/auth.test.ts`: đăng ký hợp lệ → 201 + cookie; username trùng → 409; username sai định dạng → 400; sai mật khẩu → 401 cùng thông báo; 5 lần sai/15 phút → 429 kể cả mật khẩu đúng; đăng xuất xóa phiên; phiên hết hạn → 401
- [X] T019 Cài `src/server/services/sessions.ts` (token 32 byte, lưu SHA-256 vào `data-model.md` › `sessions.token_hash`, hạn + gia hạn trượt theo `sessions.expires_at`, cookie `ms_session` theo research.md R4)
- [X] T020 [P] Cài `src/server/services/rate-limit.ts` theo quy tắc của `data-model.md` › `login_attempts`
- [X] T021 Cài `src/server/services/auth.ts`: đăng ký (Argon2id cho `users.password_hash`, `users.display_name` tùy chọn), đăng nhập (dùng rate-limit), đăng xuất (data-model.md › users)
- [X] T022 Tạo Route Handlers `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/me/route.ts` theo contracts/api.md › Xác thực (chạy T018 xanh)
- [X] T023 Tạo `src/server/http/require-user.ts` (đọc cookie → user hoặc 401) và `getCurrentUser()` cho Server Components
- [X] T024 [P] Tạo component UI dùng chung trong `src/components/ui/`: `Button.tsx` (primary cam đào / secondary trắng / danger), `Card.tsx`, `Sticker.tsx` (tiêu đề nghiêng), `Field.tsx` (label + input/textarea + lỗi), `Chip.tsx`, `Avatar.tsx` (màu pastel theo user), `Sheet.tsx` (bottom sheet xác nhận), `BottomNav.tsx` (5 mục: Nhật ký, Khoảnh khắc, Chụp, Viết, Bạn bè; mục đang mở nền lavender) — theo các artboard của bản thiết kế
- [X] T025 Tạo trang `src/app/login/page.tsx` (tab Đăng nhập/Đăng ký, tên hiển thị khi đăng ký, lỗi tiếng Việt; artboard "Đăng nhập / Đăng ký"); đã đăng nhập → chuyển `/`
- [X] T026 Tạo `src/app/(app)/layout.tsx`: kiểm phiên bằng `getCurrentUser()` (chưa đăng nhập → `/login`), render `BottomNav`

**Checkpoint**: Đăng ký/đăng nhập chạy được, `npm test` xanh cho auth, khung app có thanh điều hướng

---

## Phase 3: User Story 1 - Viết nhật ký và xem lại theo timeline (Priority: P1) 🎯 MVP

**Goal**: Tạo/sửa/xóa bài có ngày giờ và ảnh, xem timeline nhóm theo ngày

**Independent Test**: spec.md › US1 Independent Test; quickstart.md › mục 5.1

### Tests for User Story 1 ⚠️ (viết trước, phải ĐỎ trước khi cài đặt)

- [X] T027 [P] [US1] Unit test `tests/unit/entry-rules.test.ts`: độ dài `entries.title`/`entries.body`, bài trống bị từ chối (FR-007), `entries.event_at` tương lai > 1 phút bị từ chối, thiếu `eventAt` = bây giờ theo `APP_TIMEZONE`
- [X] T028 [P] [US1] Unit test `tests/unit/timeline.test.ts`: thứ tự `event_at DESC, created_at DESC, id DESC`, nhóm theo `event_date`, encode/decode cursor, nhảy tới ngày
- [X] T029 [P] [US1] Integration test `tests/integration/photos.test.ts`: presign với `size` > 10 MB → 413, loại không cho phép → 415; complete với nội dung PDF giả đuôi jpg → 415 và object bị xóa; complete ảnh thật → `pending` có `width/height`, tạo `display`/`thumb` không còn EXIF; người khác gọi `GET /api/photos/:id/display` → 404; chủ → 302 + `Cache-Control: private, no-store`; > 30 ảnh chưa gắn → 422
- [X] T030 [P] [US1] Integration test `tests/integration/entries.test.ts`: tạo bài chỉ chữ / có ảnh; gắn ảnh của người khác → 422; > 10 ảnh → 422; `GET /api/entries?scope=mine` đúng thứ tự + phân trang + `date=`; PATCH đổi `eventAt` và bỏ một ảnh (object bị xóa); người khác PATCH/DELETE/GET → 404; DELETE xóa bài + ảnh

### Implementation for User Story 1

- [X] T031 [P] [US1] Cài `src/server/domain/entry-rules.ts` theo `data-model.md` › `entries.title`, `entries.body`, `entries.event_at`, `entries.kind` và quy tắc ít-nhất-một của entries (dùng `clock.ts`)
- [X] T032 [P] [US1] Cài `src/server/domain/timeline.ts` (sắp xếp, nhóm ngày, cursor base64url — research.md R9)
- [X] T033 [P] [US1] Cài `src/server/domain/access.ts` (`canView`, `canEdit`, `canViewUnattachedPhoto`) đúng bảng "Quy tắc truy cập" của data-model.md, gồm cả nhánh audience + còn là bạn
- [X] T034 [P] [US1] Cài `src/server/storage/image-processing.ts`: xác định định dạng theo nội dung cho `data-model.md` › `photos.format`, HEIC → JPEG bằng `heic-convert`, `.rotate()`, tạo `display.webp` (≤ 2048) và `thumb.webp` (≤ 480) không metadata, trả `photos.width`/`photos.height` (research.md R7)
- [X] T035 [US1] Cài `src/server/services/photos.ts`: tạo presign (giới hạn `data-model.md` › `photos.bytes`, tối đa 30 ảnh chưa gắn), complete (chuyển `photos.status` uploading → pending), xóa ảnh chưa gắn, lấy URL biến thể sau khi kiểm `access.ts` (phụ thuộc T033, T034)
- [X] T036 [US1] Tạo Route Handlers `src/app/api/photos/route.ts`, `src/app/api/photos/[id]/route.ts`, `src/app/api/photos/[id]/complete/route.ts`, `src/app/api/photos/[id]/[variant]/route.ts` theo contracts/api.md › Ảnh (runtime `nodejs`; T029 xanh)
- [X] T037 [US1] Cài `src/server/services/entries.ts`: tạo/sửa/xóa/lấy/`listMine` trong transaction; gắn ảnh (`photos.entry_id`, `photos.position`, `photos.status` → attached; tối đa 10), xóa object R2 sau khi commit; ở story này audience luôn `private` (`entries.audience_mode`) — US4 mở rộng
- [X] T038 [US1] Tạo Route Handlers `src/app/api/entries/route.ts` (POST, GET `scope=mine`) và `src/app/api/entries/[id]/route.ts` (GET/PATCH/DELETE) theo contracts/api.md › Bài nhật ký (T027, T028, T030 xanh)
- [X] T039 [P] [US1] Tạo `src/lib/format-date.ts` (`Intl.DateTimeFormat('vi-VN')`: "Thứ Ba, 25/11/2026", "20:30", nhãn "Hôm nay"/"Hôm qua")
- [X] T040 [P] [US1] Tạo `src/lib/upload.ts`: presign → `XMLHttpRequest` PUT có tiến trình → complete; tối đa 3 ảnh song song; thử lại từng ảnh
- [X] T041 [P] [US1] Tạo `src/components/journal/PhotoGrid.tsx` (lưới 4 cột, thêm/gỡ ảnh, thanh tiến trình, đếm "n/10", lỗi định dạng/dung lượng; nút Chụp ảnh / Thư viện) — artboard "Viết nhật ký"
- [X] T042 [US1] Tạo `src/components/journal/EntryForm.tsx` (tiêu đề, ngày + giờ điền sẵn bây giờ, nội dung, PhotoGrid; giữ nội dung khi lỗi mạng/hết phiên) — artboard "Viết nhật ký"
- [X] T043 [US1] Tạo trang `src/app/(app)/journal/new/page.tsx` và `src/app/(app)/journal/[id]/edit/page.tsx` (chỉ chủ bài, khác → notFound)
- [X] T044 [P] [US1] Tạo `src/components/journal/DayStrip.tsx` (dải 7 ngày, ngày tương lai vô hiệu, chấm có bài), `EntryCard.tsx` (giờ, tiêu đề hoặc đoạn đầu, thumb đầu tiên + số ảnh, biểu tượng riêng tư/chia sẻ), `TimelineList.tsx` (nhóm ngày, đường timeline, tải dần bằng IntersectionObserver) trong `src/components/journal/` — artboard "Nhật ký của tôi"
- [X] T045 [US1] Tạo trang `src/app/(app)/journal/page.tsx` (trang đầu render server qua `services/entries.ts`, `?date=` nhảy ngày, nút lịch + nút viết)
- [X] T046 [US1] Tạo trang `src/app/(app)/journal/[id]/page.tsx` (ảnh lớn + dải thumb, xem lớn khi bấm, nội dung, nút Sửa và Xóa có `Sheet` xác nhận chỉ cho chủ bài; người xem chỉ đọc) — artboard "Chi tiết bài"

**Checkpoint**: US1 dùng được độc lập — MVP nhật ký cá nhân

---

## Phase 4: User Story 2 - Đăng nhanh khoảnh khắc bằng camera (Priority: P2)

**Goal**: Mở camera trong app, chụp, thêm chú thích, đăng trong vài giây

**Independent Test**: spec.md › US2 Independent Test; quickstart.md › mục 5.2

### Tests for User Story 2 ⚠️

- [X] T047 [P] [US2] Integration test `tests/integration/quick-post.test.ts`: `kind=quick` yêu cầu đúng 1 ảnh và chú thích ≤ 200 ký tự (thu hẹp `data-model.md` › `entries.body` cho bài quick), `eventAt` thiếu = lúc gửi theo `APP_TIMEZONE`, bài xuất hiện đầu `scope=mine`

### Implementation for User Story 2

- [X] T048 [US2] Bổ sung quy tắc bài `quick` (1 ảnh, chú thích ≤ 200, không tiêu đề) vào `src/server/domain/entry-rules.ts` (T047 xanh)
- [X] T049 [P] [US2] Tạo `src/components/camera/CameraView.tsx`: `getUserMedia` facingMode, đổi camera trước/sau, torch khi hỗ trợ (ẩn nếu không), chụp qua canvas → JPEG 0.9, dừng track khi rời trang; dự phòng `<input type="file" accept="image/*" capture="environment">` khi bị từ chối quyền/không có camera kèm lời giải thích; nút Thư viện — artboard "Đăng nhanh – Camera" (research.md R12)
- [X] T050 [P] [US2] Tạo `src/components/camera/ReviewStep.tsx`: ảnh vừa chụp, chú thích dạng nhãn trên ảnh (≤ 200), Chụp lại / Hủy (không tạo bài), nút Đăng (upload qua `lib/upload.ts` rồi `POST /api/entries` `kind=quick`), giữ ảnh + chú thích khi lỗi để thử lại; khu "Ai được xem" tạm cố định "Chỉ mình tôi" (US4 thay bằng AudiencePicker) — artboard "Xem lại & chọn người xem"
- [X] T051 [US2] Tạo trang `src/app/(app)/page.tsx` ghép CameraView → ReviewStep, sau khi đăng chuyển `/journal`; header có avatar và nút Bạn bè

**Checkpoint**: US1 + US2 hoạt động; đăng nhanh ở chế độ riêng tư

---

## Phase 5: User Story 3 - Kết bạn (Priority: P3)

**Goal**: Gửi/chấp nhận/từ chối/hủy lời mời, xem và hủy kết bạn

**Independent Test**: spec.md › US3 Independent Test; quickstart.md › mục 5.3

### Tests for User Story 3 ⚠️

- [X] T052 [P] [US3] Integration test `tests/integration/friends.test.ts`: gửi lời mời → pending; username không tồn tại/chính mình → 422; gửi trùng → không tạo bản mới; hai bên cùng mời → thành bạn ngay và xóa cả hai lời mời; accept/decline/hủy lời mời; hủy kết bạn → không còn trong danh sách của cả hai; `GET /api/friends` trả `friends`/`incoming`/`outgoing`

### Implementation for User Story 3

- [X] T053 [US3] Cài `src/server/services/friends.ts` theo sơ đồ chuyển trạng thái trong data-model.md (`friend_requests.from_user_id`/`to_user_id`, `friendships.user_a_id` < `friendships.user_b_id`); hủy kết bạn trong một transaction xóa friendship **và** mọi `entry_audience` giữa hai người theo cả hai chiều (FR-032)
- [X] T054 [US3] Tạo Route Handlers `src/app/api/friends/route.ts`, `src/app/api/friends/[userId]/route.ts`, `src/app/api/friends/requests/route.ts`, `src/app/api/friends/requests/[userId]/route.ts`, `src/app/api/friends/requests/[userId]/accept/route.ts`, `src/app/api/friends/requests/[userId]/decline/route.ts` theo contracts/api.md › Bạn bè (T052 xanh)
- [X] T055 [P] [US3] Tạo `src/components/friends/AddFriendForm.tsx`, `RequestList.tsx` (lời mời đến: Đồng ý/Từ chối; đã gửi: viền nét đứt + Hủy), `FriendList.tsx` (menu hủy kết bạn có xác nhận) — artboard "Bạn bè & lời mời"
- [X] T056 [US3] Tạo trang `src/app/(app)/friends/page.tsx` (hiện `@username` của mình, ghép các component)
- [X] T057 [US3] Hiện chấm số lời mời đến trên nút Bạn bè ở header camera (`src/app/(app)/page.tsx`) và `BottomNav` (`src/components/ui/BottomNav.tsx`)

**Checkpoint**: Kết bạn hoạt động độc lập

---

## Phase 6: User Story 4 - Chia sẻ khoảnh khắc và xem của bạn bè (Priority: P4)

**Goal**: Chọn người xem cho từng bài, bảng "Khoảnh khắc" của bạn bè, thu hồi ngay

**Independent Test**: spec.md › US4 Independent Test; quickstart.md › mục 5.4 và 5.5

### Tests for User Story 4 ⚠️

- [X] T058 [P] [US4] Unit test `tests/unit/audience.test.ts`: `private` → rỗng; `friends` → đúng bạn hiện tại; `custom` chứa người không phải bạn → lỗi `RULE`; mặc định lần đầu `private`, lần sau theo `users.last_audience`
- [X] T059 [P] [US4] Integration test `tests/integration/access-denied.test.ts` (SC-006): với bài + từng biến thể ảnh, khách → 401/404, người không được chọn → 404, người bị bỏ khỏi người xem → 404 ở yêu cầu kế tiếp, người đã hủy kết bạn → 404 (cả hai chiều), người xem gọi PATCH/DELETE/gỡ ảnh/đổi người xem → 404; response của người xem không có `audience`
- [X] T060 [P] [US4] Integration test `tests/integration/moments.test.ts`: `scope=friends` chỉ chứa bài được chia sẻ cho mình, đúng thứ tự, có `author`; "Tất cả bạn bè" là ảnh chụp tại lúc lưu (bạn mới không thấy bài cũ — FR-028); kết bạn lại không khôi phục bài cũ; sửa bài → người xem thấy bản mới; xóa bài → biến mất

### Implementation for User Story 4

- [X] T061 [P] [US4] Cài `src/server/domain/audience.ts` theo quy tắc ghi của `data-model.md` › `entry_audience` và `entries.audience_mode`, đọc/ghi `users.last_audience`
- [X] T062 [US4] Mở rộng `src/server/services/entries.ts`: lưu/thay thế `entry_audience` khi tạo/sửa, cập nhật `users.last_audience`, `listFriends` (join `entry_audience` + friendships), chỉ trả `audience` cho chủ bài (T058, T060 xanh)
- [X] T063 [US4] Cập nhật `src/app/api/entries/route.ts` hỗ trợ `scope=friends` và `src/app/api/me/route.ts` trả `lastAudience` theo contracts/api.md (T059 xanh)
- [X] T064 [P] [US4] Tạo `src/components/camera/AudiencePicker.tsx`: chip "Chỉ mình tôi" / "Tất cả bạn bè" / "Chọn bạn…", hàng avatar bạn bè bật/tắt có dấu tích, nhãn nút Đăng hiển thị tóm tắt — artboard "Xem lại & chọn người xem"
- [X] T065 [US4] Gắn `AudiencePicker` vào `src/components/camera/ReviewStep.tsx` và `src/components/journal/EntryForm.tsx` (ô "Ai được xem"), mặc định từ `GET /api/me` `lastAudience`
- [X] T066 [P] [US4] Tạo `src/components/moments/MomentCard.tsx` (avatar + tên + giờ + loại; ảnh lớn có chú thích dạng nhãn cho bài quick; thẻ chữ + lưới ảnh cho bài journal) — artboard "Khoảnh khắc bạn bè"
- [X] T067 [US4] Tạo trang `src/app/(app)/moments/page.tsx` (nhóm theo ngày, tải dần)
- [X] T068 [US4] Cập nhật `src/app/(app)/journal/[id]/page.tsx` khu "Đang chia sẻ với…" + "Đổi người xem" cho chủ bài, và `src/components/journal/EntryCard.tsx` hiện "Chỉ mình tôi" / "Tất cả bạn bè" / "n bạn: …"

**Checkpoint**: Cả 4 story hoạt động; bộ access-denied xanh

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T069 Viết test `tests/integration/cleanup.test.ts` rồi cài `src/server/services/cleanup.ts` (xóa ảnh `uploading`/`pending` > 24h + object, object R2 mồ côi, phiên hết hạn, login_attempts > 15 phút) và `src/app/api/cron/cleanup/route.ts` (kiểm `CRON_SECRET`, contracts/api.md › Cron); khai báo cron hằng ngày trong `vercel.json`
- [X] T070 [P] Viết `scripts/backup.ts` (pg_dump `--format=custom` + tải toàn bộ `photos/` từ R2 vào `backups/memorysave-<time>/`, in số liệu) — research.md R13
- [X] T071 [P] Viết `scripts/restore.ts` (pg_restore vào `RESTORE_DATABASE_URL`, tải ảnh lên `RESTORE_R2_BUCKET`, so số ảnh DB/object; không đụng DB đang chạy) — research.md R13
- [X] T072 [P] Thêm header bảo mật trong `next.config.ts` (`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(self)`) và kiểm tra mọi route ảnh trả `Cache-Control: private, no-store`
- [X] T073 [P] Viết `README.md`: giới thiệu, chạy local, cấu hình Neon/R2 (kèm JSON CORS mẫu)/Vercel, deploy, sao lưu — đồng bộ với quickstart.md
- [ ] T074 Rà giao diện ở 360px và 390px trên mọi trang (không cuộn ngang, vùng chạm ≥ 44px, focus bàn phím rõ, `aria-label` cho nút chỉ có icon) và so với bản thiết kế
- [X] T075 Chạy `npm run lint`, `npm test`, `npm run build` (với PGlite/biến giả nếu cần) và sửa đến khi xanh
- [ ] T076 Triển khai: tạo Neon project + branch `dev`, bucket R2 private + CORS, project Vercel + biến môi trường; deploy và chạy toàn bộ kịch bản quickstart.md › mục 5–6 trên bản Vercel (cần tài khoản của người dùng)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → các user story
- **US1 (P1)**: chỉ cần Phase 2 — MVP
- **US2 (P2)**: cần US1 (luồng upload ảnh `lib/upload.ts`, services/entries, trang Nhật ký để quay về)
- **US3 (P3)**: chỉ cần Phase 2 — có thể làm song song với US1/US2
- **US4 (P4)**: cần US1 (bài), US3 (bạn bè); tích hợp vào US2 (ReviewStep)
- **Polish (Phase 7)**: sau các story cần thiết; T076 cuối cùng

```text
Setup → Foundational ─┬─▶ US1 ─▶ US2 ─┐
                      └─▶ US3 ────────┴─▶ US4 ─▶ Polish
```

### Trong mỗi story

- Test viết trước và phải ĐỎ → domain (thuần) → service → Route Handler → component → trang
- Task cùng file chạy tuần tự (vd. T037 → T062 cùng `services/entries.ts`; T031 → T048 cùng `entry-rules.ts`)

### Parallel Opportunities

- Phase 1: T003, T004, T005 song song sau T001–T002
- Phase 2: T010–T017 song song sau T009; T020 song song với T019; T024 song song với chuỗi auth
- US1: T027–T030 cùng lúc; T031–T034 cùng lúc; T039–T041 và T044 song song với chuỗi API
- US3 có thể giao cho người/agent khác ngay khi Phase 2 xong
- US4: T058–T060 cùng lúc; T061, T064, T066 song song

## Parallel Example: User Story 1

```text
# Test (song song):
T027 tests/unit/entry-rules.test.ts
T028 tests/unit/timeline.test.ts
T029 tests/integration/photos.test.ts
T030 tests/integration/entries.test.ts

# Domain + xử lý ảnh (song song):
T031 src/server/domain/entry-rules.ts
T032 src/server/domain/timeline.ts
T033 src/server/domain/access.ts
T034 src/server/storage/image-processing.ts

# UI tiện ích (song song với T035–T038):
T039 src/lib/format-date.ts
T040 src/lib/upload.ts
T041 src/components/journal/PhotoGrid.tsx
T044 src/components/journal/{DayStrip,EntryCard,TimelineList}.tsx
```

## Parallel Example: User Story 4

```text
T058 tests/unit/audience.test.ts
T059 tests/integration/access-denied.test.ts
T060 tests/integration/moments.test.ts
T061 src/server/domain/audience.ts
T064 src/components/camera/AudiencePicker.tsx
T066 src/components/moments/MomentCard.tsx
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 + Phase 2
2. Phase 3 (US1) → **dừng và kiểm chứng** theo quickstart.md › 5.1 → có thể deploy sớm lên Vercel
3. Đây là nhật ký cá nhân dùng được, chưa có camera nhanh và bạn bè

### Incremental Delivery

1. + US2 → đăng nhanh bằng camera (riêng tư) → deploy, thử trên điện thoại
2. + US3 → kết bạn → deploy
3. + US4 → chia sẻ + bảng Khoảnh khắc; bộ access-denied phải xanh trước khi deploy (constitution II)
4. Polish → cron, sao lưu, README, deploy chính thức

### Ghi chú

- Không đánh dấu xong khi test của task đang đỏ (constitution › Quy trình phát triển)
- Thay đổi chạm phân quyền, upload, schema: rà riêng theo Nguyên tắc II, IV, V
- Commit sau mỗi task hoặc nhóm task logic

---

## Phase 8: User Story 5 - Mời bạn bằng link và mã định danh (Priority: P5) — rev 3

**Goal**: Mã định danh công khai thay tên đăng nhập; link kết bạn tự động (spec.md › US5, FR-037..FR-041)

**Independent Test**: spec.md › US5 Independent Test

> T076 (triển khai) nên làm sau phase này.

### Tests for User Story 5 ⚠️

- [X] T077 [P] [US5] Unit test `tests/unit/handle.test.ts`: sinh phần chữ từ tên hiển thị tiếng Việt (bỏ dấu, `đ`→`d`, nối bằng dấu chấm, ≤ 20 ký tự, rỗng → `ban`) và định dạng `data-model.md` › `users.handle`
- [X] T078 [P] [US5] Integration test `tests/integration/invites.test.ts`: đăng ký sinh `handle` + `invite_token`; xem lời mời không cần đăng nhập; accept → bạn bè ngay + xóa lời mời đang chờ; link của chính mình → 422; đã là bạn → giữ nguyên; tạo link mới → link cũ 404
- [X] T079 [P] [US5] Integration test `tests/integration/username-privacy.test.ts` (SC-009): phản hồi `/api/friends`, `/api/entries?scope=friends`, `/api/entries/:id`, `/api/invites/:token` cho người khác không chứa tên đăng nhập của chủ; `/api/me` chỉ trả `username` cho chính chủ; gửi lời mời bằng tên đăng nhập → 422, bằng mã định danh → thành công

### Implementation for User Story 5

- [X] T080 [US5] Thêm cột `data-model.md` › `users.handle`, `users.invite_token` vào `src/server/db/schema.ts` và sinh migration `drizzle/0001_*.sql` có bước điền giá trị cho tài khoản cũ trước khi đặt NOT NULL/UNIQUE
- [X] T081 [P] [US5] Cài `src/server/domain/handle.ts` (thuần: `handleBase`, `formatHandle`, `isValidHandle`, `normalizeHandle`) (T077 xanh)
- [X] T082 [US5] Cập nhật `src/server/services/auth.ts`: sinh `handle` duy nhất (thử lại khi trùng, tăng số chữ số) và `invite_token` khi đăng ký; `toUserRef` trả `handle` thay `username`; `src/lib/types.ts` đổi `UserRef`; `/api/me` thêm `username` cho chính chủ
- [X] T083 [US5] Cập nhật mọi truy vấn trả người dùng (`services/friends.ts`, `services/entries.ts`, `services/audience.ts`, `services/sessions.ts`) để chọn `handle`; `sendRequest` tìm theo `handle` (`POST /api/friends/requests` nhận `{ handle }`)
- [X] T084 [US5] Cài `src/server/services/invites.ts` (xem lời mời, chấp nhận, lấy/đổi link) và Route Handlers `src/app/api/friends/invite-link/route.ts`, `src/app/api/invites/[token]/route.ts`, `src/app/api/invites/[token]/accept/route.ts` theo contracts/api.md › Link kết bạn (T078, T079 xanh)
- [X] T085 [US5] Trang `src/app/add/[token]/page.tsx` + client tự kết bạn khi đã đăng nhập; `/login?next=` (chỉ đường dẫn nội bộ) trong `src/app/login/page.tsx` và `LoginForm.tsx`
- [X] T086 [P] [US5] Trang Bạn bè: hiện mã định danh (sao chép), thẻ "Link kết bạn" (sao chép / chia sẻ qua `navigator.share` / tạo link mới có xác nhận) trong `src/components/friends/InviteLinkCard.tsx`; `AddFriendForm` nhập mã định danh; mọi chỗ `@username` → `@handle` (`RequestList.tsx`, `FriendList.tsx`, `friends/page.tsx`)
- [X] T087 [US5] Cập nhật test cũ dùng `username` của người khác (`friends.test.ts`, `entries.test.ts`, `moments.test.ts`, `access-denied.test.ts`), `scripts/seed-local.ts` và README; chạy `npm test`, lint, typecheck, build

### Rev 3.1 — tên hiển thị bắt buộc

- [X] T088 [US5] Tên hiển thị bắt buộc khi đăng ký (spec.md › FR-001; `data-model.md` › `users.display_name`): test trong `tests/integration/auth.test.ts` (thiếu/rỗng → 400 trường `displayName`), migration `drizzle/0002_*.sql` điền giá trị cho hàng cũ rồi đặt NOT NULL + CHECK, `RegisterBody` trong `src/server/http/schemas.ts`, ô nhập bắt buộc trong `src/app/login/LoginForm.tsx`, cập nhật `tests/helpers/factories.ts`
