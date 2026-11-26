---
description: "Task list — Trang giới thiệu công khai (004-landing-page)"
---

# Tasks: Trang giới thiệu công khai

**Input**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/routes.md](./contracts/routes.md), [quickstart.md](./quickstart.md)

**Tests**: Bắt buộc (Constitution III) cho proxy (chuyển hướng + route công khai) và các tệp SEO. Viết trước, xác nhận đỏ.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] Tạo `src/lib/routes.ts` export `HOME_PATH = "/camera"` (research R1)

---

## Phase 2: Foundational — chuyển màn Chụp sang `/camera`

**⚠️** Phải xong trước US1 vì `/` chỉ map được một page.

- [X] T002 `git mv src/app/(app)/page.tsx src/app/(app)/camera/page.tsx` và `loading.tsx` tương tự
- [X] T003 Thay mọi đích mặc định `"/"` bằng `HOME_PATH` theo contracts/routes.md › Đích mặc định:
  `src/app/login/{page,LoginForm}.tsx`, `src/app/login/google/{page,GoogleSignupForm}.tsx`,
  `src/server/services/google-login.ts`, `src/app/add/[token]/{page,AcceptInvite}.tsx`, `src/app/(app)/moments/page.tsx`,
  `src/components/ui/BottomNav.tsx` (href + `match`), `src/app/manifest.ts` (`start_url`)
- [X] T004 Cập nhật `tests/integration/google-login.test.ts` (`"/"` → `"/camera"`) và `tests/unit/site-files.test.ts`
  (`start_url`); `npx next typegen`; chạy toàn bộ test xanh

**Checkpoint**: app chạy như cũ ở `/camera`; `/` tạm thời không có trang (404 cho khách)

---

## Phase 3: User Story 2 — Người đã đăng nhập vào thẳng màn Chụp (P1)

### Tests (viết trước, phải đỏ)

- [X] T005 [US2] Cập nhật `tests/unit/proxy.test.ts`: `/` không cookie → không chuyển hướng; `/` có cookie → 307
  `/camera`; `/camera` không cookie → 307 `/login?next=%2Fcamera`; bỏ ca cũ "`/` → `/login`"; danh sách page `(app)` chứa
  `/camera` (contracts/routes.md › Hành vi theo route)

### Implementation

- [X] T006 [US2] Sửa `src/proxy.ts`: matcher thêm `/camera/:path*`; nhánh `/` theo research R2; chạy T005 xanh

**Checkpoint**: đã đăng nhập vào `/` → `/camera`

---

## Phase 4: User Story 1 — Người lạ hiểu MemorySave và bắt đầu dùng (P1) 🎯

### Tests (viết trước, phải đỏ)

- [X] T007 [P] [US1] `tests/unit/landing.test.ts`: `landing-content` có đúng 4 tính năng, 3 bước, ≥ 4 câu hỏi; `jsonLd()`
  là `WebApplication` với `inLanguage "vi"`, `isAccessibleForFree`, giá 0 VND, `url` tuyệt đối; chuỗi JSON-LD đã escape
  `<`; metadata của `src/app/page.tsx` có `alternates.canonical "/"`, không `robots` noindex, `openGraph.url "/"`
- [X] T008 [P] [US1] Thêm vào `tests/unit/site-files.test.ts`: `sitemap()` có `/` và `/login` (contracts/routes.md ›
  sitemap), `robots()` có `sitemap`, metadata `/login` có `alternates.canonical "/login"`

### Implementation

- [X] T009 [P] [US1] Tạo `src/lib/landing-content.ts` (FEATURES, STEPS, FAQ, LANDING_TITLE, LANDING_DESCRIPTION,
  `jsonLd()`, `jsonLdScript()`) theo research R3–R4; chạy phần T007 tương ứng xanh
- [X] T010 [P] [US1] Tạo `src/app/sitemap.ts`; thêm `sitemap` vào `src/app/robots.ts`; thêm `alternates.canonical` vào
  `src/app/login/page.tsx`; chạy T008 xanh
- [X] T011 [US1] Tạo component `src/components/landing/PhoneMockup.tsx` (điện thoại minh họa: header MemorySave, 2 thẻ
  nhật ký mẫu hư cấu có khối ảnh màu + chip người xem, thanh điều hướng mini; `aria-hidden` vì trang trí — FR-L03)
- [X] T012 [US1] Tạo `src/app/page.tsx`: metadata (research R4), JSON-LD script, các phần hero (h1, mô tả, nút Tạo tài
  khoản → `/login?mode=register`, Google khi `getGoogleConfig()`, Đăng nhập), PhoneMockup, 4 tính năng, 3 bước, FAQ
  (`<details>`), CTA cuối, footer; theo FR-L02, FR-L10; chạy T007 xanh
- [X] T013 [US1] Xem trang ở 360px và 480px (ảnh chụp màn hình) — không cuộn ngang, chữ rõ, nút đủ lớn

**Checkpoint**: khách mở `/` thấy trang giới thiệu đầy đủ

---

## Phase 5: Polish

- [X] T014 [P] Cập nhật `README.md` (mô tả route `/` và `/camera`), `docs/DEPLOY.md` mục 4 (Lighthouse, Rich Results Test)
- [X] T015 `npm test`, `npm run typecheck`, `npm run lint` xanh
- [X] T016 Chạy quickstart.md › Kiểm tra bằng lệnh trên dev server

---

## Dependencies & Execution Order

```text
Setup (T001) ─► Foundational (T002–T004) ─► US2 (T005–T006) ─► US1 (T007–T013) ─► Polish
```

US2 làm trước US1 vì proxy hiện chuyển `/` → `/login`; phải đổi trước khi trang giới thiệu hiển thị được cho khách.
Song song: T007 + T008; T009 + T010.

## Implementation Strategy

Một lần giao cả hai story (cùng phụ thuộc việc giải phóng `/`); không deploy giữa chừng vì sau T004 `/` trống.
