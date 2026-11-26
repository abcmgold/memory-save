---
description: "Task list — SEO cơ bản & xem trước khi chia sẻ link (003-seo-sharing)"
---

# Tasks: SEO cơ bản & xem trước khi chia sẻ link

**Input**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/http.md](./contracts/http.md), [quickstart.md](./quickstart.md)

**Tests**: Bắt buộc theo Constitution III — proxy (ca bị chuyển hướng + ca route công khai không bị chặn) và thẻ chia
sẻ (không lộ dữ liệu). Viết test trước, xác nhận đỏ.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] Copy `be-vietnam-pro-{latin,latin-ext,vietnamese}-900-normal.woff` từ `node_modules/@fontsource/be-vietnam-pro/files/`
  vào `assets/fonts/` (research R5)
- [X] T002 [P] Tạo `src/lib/session-cookie.ts` export `SESSION_COOKIE = "ms_session"` (không import server-only); sửa
  `src/server/services/sessions.ts` import từ đó và re-export như cũ (research R2)
- [X] T003 [P] Tạo `src/lib/site.ts › siteUrl()` theo research R4

---

## Phase 2: Foundational

- [X] T004 Sửa `src/app/layout.tsx`: `metadataBase: new URL(siteUrl())`, `title`, `description`, `openGraph { siteName,
  locale "vi_VN", type "website", title, description }`, `twitter { card: "summary_large_image" }` (contracts/http.md ›
  Thẻ `<head>`)

**Checkpoint**: mọi trang có metadataBase; chưa đổi hành vi

---

## Phase 3: User Story 1 — Trang riêng tư không bị lập chỉ mục, chuyển hướng gọn (P1) 🎯 MVP

**Independent Test**: quickstart.md › Kiểm tra bằng lệnh (5 dòng đầu) + kịch bản 1.

### Tests (viết trước, phải đỏ)

- [X] T005 [P] [US1] `tests/unit/proxy.test.ts`: gọi `proxy(new NextRequest(...))` — không cookie `/` → 307 `/login`; không
  cookie `/journal/abc?x=1` → 307 `/login?next=%2Fjournal%2Fabc%3Fx%3D1`; cookie rỗng → 307; có cookie → không chuyển hướng;
  dùng `unstable_doesMiddlewareMatch` (`next/experimental/testing/server`) chứng minh mọi `page.tsx` trong `src/app/(app)` khớp và `/login`,
  `/login/google`, `/add/x`, `/api/me`, `/robots.txt`, `/manifest.webmanifest`, `/icon/192`, `/apple-icon`,
  `/opengraph-image`, `/_next/static/x.js`, `/favicon.ico` không khớp (FR-S01, FR-S02)
- [X] T006 [P] [US1] `tests/unit/site-files.test.ts`: `robots()` đúng contracts/http.md › robots.txt; metadata của
  `src/app/(app)/layout.tsx` có `robots.index === false`; `/login` có description riêng (FR-S04, FR-S05)

### Implementation

- [X] T007 [US1] Tạo `src/proxy.ts` (matcher tường minh `/`, `/journal/:path*`, `/moments/:path*`, `/me/:path*`) theo
  research R2 và contracts/http.md › Chuyển hướng sớm; chạy T005 xanh
- [X] T008 [P] [US1] Tạo `src/app/robots.ts` (research R3)
- [X] T009 [P] [US1] Thêm `export const metadata = { robots: { index: false, follow: false } }` vào `src/app/(app)/layout.tsx`
- [X] T010 [P] [US1] Thêm `description` riêng cho `src/app/login/page.tsx`; chạy T006 xanh

**Checkpoint**: chưa đăng nhập → 307; robots.txt có; trang riêng tư noindex

---

## Phase 4: User Story 2 — Link mời hiện xem trước đẹp (P1)

**Independent Test**: quickstart.md kịch bản 2–4.

### Tests (viết trước, phải đỏ)

- [X] T011 [P] [US2] `tests/unit/share-text.test.ts`: `inviteShareTitle("Bùi Tuấn")` = "Bùi Tuấn mời bạn kết bạn trên
  MemorySave"; mô tả; `cardNameFontSize` giảm theo độ dài tên (≤ 50 ký tự theo data-model.md › users.display_name)
- [X] T012 [US2] `tests/integration/share-metadata.test.ts` (PGlite): `generateMetadata` của `src/app/add/[token]/page.tsx`
  với token hợp lệ → title/og:title có tên, `robots.index === false`; token sai → title chung, không có tên; JSON metadata
  không chứa username/email/token khác (FR-S07–S09); không tạo dòng `friendships`; render `opengraph-image` của `/add/[token]`
  và root trả `image/png` không rỗng

### Implementation

- [X] T013 [P] [US2] Tạo `src/lib/share-text.ts` (thuần): `SITE_TITLE`, `SITE_DESCRIPTION`, `inviteShareTitle`,
  `inviteShareDescription`, `cardNameFontSize`; chạy T011 xanh
- [X] T014 [P] [US2] Thêm `inviterNameByToken(token)` bọc `cache()` vào `src/server/services/invites.ts` — trả
  `{ id, displayName } | null` theo data-model.md › users.invite_token, users.display_name, users.id
- [X] T015 [US2] Tạo `src/server/og/card.tsx`: nạp 3 font woff (module scope), `OG_SIZE`, `renderShareCard({ name?, seed? })`
  → `ImageResponse` theo research R5 (flexbox, nền kem chấm bi, khung viền đen + bóng cứng, nhãn MemorySave lavender, avatar
  chữ cái đầu, tên tối đa 2 dòng)
- [X] T016 [P] [US2] Tạo `src/app/opengraph-image.tsx` (ảnh chung, `alt`, `size`, `contentType`)
- [X] T017 [US2] Tạo `src/app/add/[token]/opengraph-image.tsx` (tên người mời; token sai → ảnh chung) và thêm
  `generateMetadata` vào `src/app/add/[token]/page.tsx` (bỏ `metadata` tĩnh) theo contracts/http.md › Thẻ `<head>`; chạy T012 xanh
- [X] T018 [US2] Render thử hai ảnh ra file PNG và kiểm tra bằng mắt (dấu tiếng Việt, tên dài, bố cục)

**Checkpoint**: link mời có tiêu đề + ảnh riêng; link sai/khác dùng thẻ chung

---

## Phase 5: User Story 3 — Thêm vào màn hình chính (P3)

- [X] T019 [P] [US3] Thêm vào `tests/unit/site-files.test.ts`: `manifest()` đúng contracts/http.md › manifest
- [X] T020 [US3] Tạo `src/server/og/app-icon.tsx` (ô peach bo góc, viền đen, biểu tượng sổ như `BookIcon`),
  `src/app/icon.tsx` (`generateImageMetadata` 192/512), `src/app/apple-icon.tsx` (180), `src/app/manifest.ts`; chạy T019 xanh
- [X] T021 [US3] Kiểm tra `/icon/192`, `/icon/512`, `/apple-icon`, `/manifest.webmanifest` trên dev server (URL icon khớp manifest)

---

## Phase 6: Polish

- [X] T022 Cập nhật `docs/DEPLOY.md` mục 4 (kiểm tra sau deploy: 307, robots, thẻ xem trước qua Facebook debugger)
- [X] T023 `npm test`, `npm run typecheck`, `npm run lint` xanh
- [X] T024 Chạy quickstart.md › Kiểm tra bằng lệnh trên dev server local

---

## Dependencies & Execution Order

```text
Setup (T001–T003) ─► Foundational (T004) ─► US1 (T005–T010) ─► US2 (T011–T018) ─► US3 (T019–T021) ─► Polish
```

- US2 cần T001 (font), T004 (metadataBase). US3 cần T001 không bắt buộc (icon không có chữ).
- Song song: T001–T003; T005–T006; T008–T010; T011 + T013–T014; T016 sau T015.

## Implementation Strategy

MVP = US1 (sửa lỗi gốc 200 trống + noindex). Tiếp US2 (tác động lớn nhất tới việc mời bạn), cuối cùng US3.
