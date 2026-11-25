# Implementation Plan: MemorySave — nhật ký hằng ngày & chia sẻ khoảnh khắc với bạn bè

**Branch**: `001-daily-journal` | **Date**: 2026-11-25 (rev 2: PostgreSQL + Vercel/Neon/R2) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-daily-journal/spec.md`

## Summary

MemorySave là web app nhật ký mobile-first: viết nhật ký có ngày giờ và ảnh, xem theo timeline, đăng nhanh
bằng camera trong app, kết bạn bằng tên đăng nhập và chia sẻ từng bài cho bạn bè (chỉ xem). Kỹ thuật: một
project Next.js (App Router, TypeScript) triển khai miễn phí trên **Vercel**; **PostgreSQL trên Neon** qua
Drizzle; ảnh trong bucket **Cloudflare R2 private**, client tải thẳng lên bằng presigned PUT, server kiểm
tra nội dung bằng `sharp` rồi tạo ảnh thu nhỏ; xem ảnh qua API kiểm quyền rồi redirect tới link ký 60
giây; phiên cookie tự cài + Argon2id; quyền xem là bảng `entry_audience` chụp tại lúc lưu; giao diện
neo-brutalism bằng Tailwind theo thiết kế đã duyệt. Chi tiết: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22 (local hiện có 24.14; Vercel Node runtime)

**Primary Dependencies**: Next.js (App Router), React, Drizzle ORM + drizzle-kit, @neondatabase/serverless,
@electric-sql/pglite (test), @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner (R2), @node-rs/argon2,
sharp, heic-convert, zod, Tailwind CSS v4. Dev: Vitest.

**Storage**: PostgreSQL (Neon Free; branch `main` cho production, `dev` cho local); ảnh trên Cloudflare R2
bucket private `photos/<id>/{original, display.webp, thumb.webp}`

**Testing**: Vitest — unit cho `src/server/domain/*`; integration cho service + Route Handlers trên PGlite
với `PhotoStore` giả trong bộ nhớ; `npm test`, không cần mạng

**Target Platform**: Vercel (Hobby, Node runtime, HTTPS sẵn); client: iOS Safari 16+, Chrome Android, trình
duyệt desktop hiện đại

**Project Type**: Web application (một project Next.js full-stack, serverless)

**Performance Goals**: phần đầu timeline/bảng "Bạn bè" < 2 giây với 1.000 bài khi DB đang thức (SC-005);
đăng nhanh ≤ 10 giây trên mạng bình thường (SC-001)

**Constraints**: body request tới function ≤ 4,5 MB (→ upload thẳng R2); cron tối đa 1 lần/ngày; Neon ngủ
khi rảnh (lần đầu chậm vài giây); hạn mức free (DB ~0,5 GB, R2 10 GB); ảnh ≤ 10 MB, ≤ 10 ảnh/bài; không
cuộn ngang ở 360px; tiếng Việt; font tự host

**Scale/Scope**: < 100 người dùng, vài chục nghìn bài, vài GB ảnh; 8 màn hình; ~20 endpoint

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Kết quả |
|---|---|---|
| **I. Đơn giản trước tiên** | Một project/codebase; không hàng đợi, cache hay service riêng. Ba dịch vụ đám mây là hệ quả trực tiếp của yêu cầu người dùng (Postgres + deploy free); mỗi phụ thuộc gắn với một yêu cầu: Drizzle (FR-035), Neon driver/PGlite (serverless + test offline), AWS SDK (R2), argon2 (ràng buộc kỹ thuật), sharp/heic-convert (FR-014/016), zod (giới hạn spec), Tailwind (thiết kế). Không thư viện auth/UI kit. | ✅ PASS (mục bổ sung ở Complexity Tracking) |
| **II. Riêng tư mặc định** | Lần đầu mặc định `private`, lựa chọn luôn hiện trước khi đăng, chỉ chọn được bạn bè; mọi Route Handler gọi `domain/access.ts` mỗi request; không có quyền → 404; hủy kết bạn xóa audience hai chiều trong một transaction; ảnh dùng cùng hàm kiểm quyền trước khi ký link. | ✅ PASS |
| **III. Logic có test** | Module thuần có unit test; integration test bắt buộc ca bị từ chối (SC-006); `npm test` một lệnh, chạy offline nhờ PGlite + kho ảnh giả. | ✅ PASS |
| **IV. Media an toàn** | Bucket private; key = UUID; presigned PUT ký kèm Content-Length/Content-Type (≤ 10 MB); server kiểm định dạng theo nội dung trước khi ảnh dùng được; xem ảnh qua API kiểm quyền → link ký 60 giây, `no-store`; bản hiển thị xóa EXIF. | ✅ PASS (redirect link ký — xem Complexity Tracking) |
| **V. Dữ liệu bền vững** | Postgres managed; migration drizzle commit, chạy trước build, chỉ thêm không phá; `npm run backup/restore` (pg_dump + tải ảnh R2), restore vào branch mới không ghi đè; xóa bài có xác nhận. | ✅ PASS |
| **Ràng buộc kỹ thuật** | Có backend; local: `npm install` → `npm run db:migrate` → `npm run dev`; responsive từ 360px; Argon2id; bí mật chỉ ở `.env.local`/Vercel, `.env.example` commit; tiếng Việt. | ✅ PASS |

**Re-check sau Phase 1**: data model (trạng thái ảnh `uploading → pending → attached`), contract (presign →
PUT → complete; 404 khi không có quyền; `no-store`) và quickstart không thêm thành phần ngoài bảng trên.
→ ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-daily-journal/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json · next.config.ts · drizzle.config.ts · vitest.config.ts · vercel.json (cron)
.env.example · .gitignore
src/
├── app/
│   ├── layout.tsx                 # font Be Vietnam Pro, nền chấm, khung mobile ≤ 480px
│   ├── globals.css                # Tailwind v4 + token neo-brutalism
│   ├── login/page.tsx
│   ├── (app)/                     # cần đăng nhập (kiểm phiên ở layout)
│   │   ├── layout.tsx             # BottomNav
│   │   ├── page.tsx               # Camera + Xem lại (đăng nhanh)
│   │   ├── moments/page.tsx
│   │   ├── journal/page.tsx · journal/new/page.tsx
│   │   ├── journal/[id]/page.tsx · journal/[id]/edit/page.tsx
│   │   └── friends/page.tsx
│   └── api/
│       ├── auth/{register,login,logout}/route.ts · me/route.ts
│       ├── photos/route.ts · photos/[id]/route.ts
│       │   · photos/[id]/complete/route.ts · photos/[id]/[variant]/route.ts
│       ├── entries/route.ts · entries/[id]/route.ts
│       ├── friends/route.ts · friends/[userId]/route.ts
│       │   · friends/requests/route.ts · friends/requests/[userId]/{route,accept/route,decline/route}.ts
│       └── cron/cleanup/route.ts
├── server/
│   ├── env.ts                     # đọc + kiểm biến môi trường bằng zod
│   ├── db/{schema.ts, client.ts}  # client: Neon Pool; test: PGlite
│   ├── domain/                    # THUẦN — unit test
│   │   ├── access.ts · audience.ts · timeline.ts · entry-rules.ts · username.ts · clock.ts (APP_TIMEZONE)
│   ├── services/
│   │   ├── auth.ts · sessions.ts · rate-limit.ts
│   │   ├── entries.ts · friends.ts · photos.ts · cleanup.ts
│   ├── storage/
│   │   ├── photo-store.ts         # interface PhotoStore
│   │   ├── r2-photo-store.ts      # AWS SDK S3 → R2
│   │   └── image-processing.ts    # sharp + heic-convert
│   └── http/                      # requireUser, jsonError, checkOrigin
├── components/
│   ├── ui/{Button,Card,Sticker,Field,Chip,Avatar,BottomNav,Sheet}.tsx
│   ├── camera/{CameraView,ReviewStep,AudiencePicker}.tsx
│   ├── journal/{TimelineList,DayStrip,EntryCard,EntryForm,PhotoGrid}.tsx
│   ├── moments/MomentCard.tsx
│   └── friends/{AddFriendForm,RequestList,FriendList}.tsx
└── lib/{messages.ts, format-date.ts, upload.ts}   # thông báo tiếng Việt, định dạng vi-VN, presign + XHR PUT
drizzle/                           # migration SQL (commit)
scripts/{backup.ts, restore.ts}
tests/
├── unit/
├── integration/                   # gồm access-denied.test.ts
└── helpers/{test-db.ts (PGlite), memory-photo-store.ts, factories.ts, request.ts}
backups/                           # gitignored
```

**Structure Decision**: Một project Next.js full-stack ở gốc repo, triển khai lên Vercel. Ranh giới:
`src/server/domain` (thuần) ← `src/server/services` (DB + `PhotoStore`) ← `src/app/api` (HTTP mỏng).
`PhotoStore` là interface để test dùng bản trong bộ nhớ thay R2.

## Phân pha triển khai (gợi ý cho /speckit-tasks)

1. **Nền tảng**: khởi tạo Next.js + Tailwind token + font; env; Drizzle schema + migration; DB client
   (Neon/PGlite); `PhotoStore` + R2; tiện ích HTTP; đăng ký/đăng nhập/phiên + rate limit; layout + BottomNav;
   test helpers.
2. **US1 (P1)**: domain entry-rules/timeline/clock; luồng ảnh presign → PUT → complete + xem ảnh kiểm quyền;
   CRUD bài; trang Nhật ký, Viết, Chi tiết.
3. **US2 (P2)**: CameraView (getUserMedia, đổi camera, torch, dự phòng input), ReviewStep + chú thích.
4. **US3 (P3)**: dịch vụ bạn bè + trang Bạn bè + chấm báo lời mời.
5. **US4 (P4)**: audience + AudiencePicker + Khoảnh khắc + thu hồi; bộ test access-denied.
6. **Hoàn thiện & triển khai**: cron cleanup + `vercel.json`, backup/restore, CORS R2, README triển khai,
   kiểm tra 360px, deploy Vercel.

## Complexity Tracking

| Mục | Vì sao cần | Phương án đơn giản hơn bị loại vì |
|---|---|---|
| Ba dịch vụ đám mây (Vercel, Neon, R2) | Người dùng yêu cầu Postgres + triển khai/lưu trữ miễn phí; không có một dịch vụ free nào đủ cả ba với hạn mức ảnh hợp lý | Supabase gộp DB + Storage: kho ảnh 1 GB, tự tạm dừng sau 1 tuần — người dùng đã chọn Neon + R2 |
| Upload 3 bước (presign → PUT thẳng R2 → complete) + trạng thái ảnh + cron dọn | Vercel giới hạn body 4,5 MB; cần kiểm nội dung trước khi ảnh dùng được; thử lại từng ảnh, có tiến trình | Upload qua function: bị chặn ở 4,5 MB |
| Xem ảnh bằng redirect tới link ký 60 giây (thay vì proxy byte) | Tiết kiệm thời gian chạy/băng thông Vercel; mỗi lần xem vẫn qua kiểm quyền; link lộ ra hết hạn sau 60 giây | Proxy byte qua function: chậm, tốn hạn mức free; bucket public: trái Nguyên tắc IV |
| `heic-convert` ngoài `sharp` | FR-014 nhận HEIC; sharp prebuilt không giải mã HEVC | Biên dịch libvips + libheif: không làm được trên Vercel |
| Hai driver DB (Neon cho chạy thật, PGlite cho test) | Test chạy offline bằng một lệnh, không cần Docker/tài khoản | Test trên Neon thật: cần mạng + bí mật, chậm |
| Chế độ local (`npm run dev:local`: PGlite socket + kho ảnh trên đĩa, route `/api/local-storage`) | Ràng buộc "chạy local dễ dàng" — dùng thử và kiểm thử end-to-end không cần tài khoản đám mây | Bắt buộc Neon + R2 ngay cả khi dev: rào cản lớn, không kiểm chứng được trước khi đăng ký dịch vụ |
