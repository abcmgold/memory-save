# Implementation Plan: Trang giới thiệu công khai

**Branch**: `004-landing-page` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-landing-page/spec.md`

## Summary

Màn Chụp chuyển từ `/` sang `/camera`; `/` thành trang giới thiệu công khai, tĩnh (prerender), theo phong cách
neo-brutalism: hero + nút đăng ký/Google/đăng nhập, điện thoại minh họa dữ liệu hư cấu, 4 tính năng, 3 bước, câu hỏi
thường gặp, CTA cuối. Proxy: `/` có cookie → 307 `/camera`. Đích mặc định gom vào `HOME_PATH = "/camera"`. SEO: tiêu
đề/mô tả riêng, canonical, JSON-LD `WebApplication`, `sitemap.ts`, canonical cho `/login`. Chi tiết: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22

**Primary Dependencies**: Không thêm. Next.js 16 (App Router, proxy, Metadata API), React 19, Tailwind v4

**Storage**: Không dùng (trang tĩnh)

**Testing**: Vitest — unit (proxy, sitemap/robots, landing-content, metadata), cập nhật integration Google login

**Target Platform**: Vercel; trình duyệt di động/desktop; Googlebot

**Project Type**: Web application (một project Next.js)

**Performance Goals**: `/` prerender tĩnh, không truy vấn DB; Lighthouse SEO 100, Accessibility ≥ 95 (SC-003)

**Constraints**: Route tiếng Anh; cột 480px; không dữ liệu người dùng thật trên trang công khai; không ảnh nhị phân mới

**Scale/Scope**: 1 trang mới (+ vài component), 1 trang chuyển chỗ, `sitemap.ts`, sửa ~10 chỗ đích mặc định

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Kết quả |
|---|---|---|
| **I. Đơn giản trước tiên** | Không dependency; trang tĩnh; nội dung là dữ liệu thuần trong một file. | ✅ PASS |
| **II. Riêng tư mặc định** | Trang công khai chỉ có nội dung giới thiệu + dữ liệu mẫu hư cấu, không đọc DB. `/camera` vẫn là trang riêng tư (proxy 307 + `requirePageUser` + noindex). Nội dung còn nhấn mạnh "riêng tư mặc định". | ✅ PASS |
| **III. Logic có test** | Test proxy cả ca chuyển hướng `/`→`/camera`, `/camera`→`/login`; test mọi page `(app)` được che. | ✅ PASS |
| **IV. Media an toàn** | Không media mới. | ✅ N/A |
| **V. Dữ liệu bền vững** | Không đổi lược đồ. | ✅ N/A |
| **Ràng buộc kỹ thuật** | Tiếng Việt, 360px, chạy local không cấu hình mới. | ✅ PASS |

**Re-check sau Phase 1**: contracts/routes.md và data model không thêm thành phần → ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-landing-page/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/routes.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── proxy.ts                         # + /camera; "/" có cookie → 307 /camera
├── lib/routes.ts                    # mới: HOME_PATH = "/camera"
├── lib/landing-content.ts           # mới, thuần: tính năng, bước, FAQ, JSON-LD
├── app/
│   ├── page.tsx                     # mới: trang giới thiệu (+ metadata, JSON-LD)
│   ├── sitemap.ts                   # mới
│   ├── robots.ts                    # + sitemap
│   ├── manifest.ts                  # start_url → HOME_PATH
│   ├── (app)/camera/page.tsx        # chuyển từ (app)/page.tsx
│   ├── (app)/camera/loading.tsx     # chuyển từ (app)/loading.tsx
│   ├── login/page.tsx, LoginForm.tsx, google/page.tsx, google/GoogleSignupForm.tsx   # đích mặc định → HOME_PATH; canonical
│   ├── add/[token]/page.tsx, AcceptInvite.tsx, (app)/moments/page.tsx                  # nút quay về → HOME_PATH
├── components/landing/              # mới: PhoneMockup, FeatureList, Steps, Faq (server components)
├── components/ui/BottomNav.tsx      # tab Chụp → /camera
└── server/services/google-login.ts  # đích mặc định → HOME_PATH
tests/
├── unit/proxy.test.ts · unit/site-files.test.ts · unit/landing.test.ts (mới)
└── integration/google-login.test.ts # "/" → "/camera"
```

**Structure Decision**: như 001–003; component trang giới thiệu tách riêng `components/landing`.

## Complexity Tracking

Không có vi phạm cần biện minh.
