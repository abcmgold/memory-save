# Research: Trang giới thiệu công khai (004-landing-page)

Tài liệu: `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`, `…/01-metadata/sitemap.md`,
`…/04-functions/generate-metadata.md` (alternates), `…/03-file-conventions/proxy.md` (Next 16.4).

## R1. Cấu trúc route

- **Decision**: chuyển `src/app/(app)/page.tsx` + `loading.tsx` → `src/app/(app)/camera/` (`/camera`, nằm trong layout
  `(app)` nên giữ BottomNav, noindex). Trang giới thiệu là `src/app/page.tsx` **ngoài** nhóm `(app)` → không có BottomNav,
  không kế thừa noindex. Hai file không thể cùng map `/` nên việc chuyển là bắt buộc.
- Đích mặc định "trang chính" gom vào một hằng số `HOME_PATH = "/camera"` (`src/lib/routes.ts`) — thay cho các chuỗi
  `"/"` rải rác ở: `LoginForm`, `login/page`, `login/google/{page,GoogleSignupForm}`, `services/google-login`,
  `add/[token]/{page,AcceptInvite}`, `moments/page`, `BottomNav`, `manifest`.
- **Alternatives**: rewrite theo cookie để `/` vừa là giới thiệu vừa là Chụp (người dùng đã chọn `/` riêng + `/camera`).

## R2. Proxy

- `matcher` thêm `/camera/:path*`; `/` vẫn trong matcher nhưng hành vi đổi:
  - `/` + có cookie phiên → `307 /camera`; `/` + không cookie → đi tiếp (trang giới thiệu).
  - Trang riêng tư (`/camera`, `/journal`, `/moments`, `/me`) + không cookie → `307 /login?next=<path+query>` (như 003).
- Test liệt kê page `(app)` vẫn đúng (giờ có `/camera`); thêm ca `/` có/không cookie.

## R3. Trang giới thiệu — nội dung & hiển thị

- **Server Component tĩnh**: không đọc cookie/DB (Edge Cases: nhẹ, nhanh) → Next prerender lúc build, phục vụ từ CDN.
  Nút Google hiển thị theo `getGoogleConfig()` đọc lúc build (Vercel có env khi build); đổi env cần redeploy (đã là quy
  trình hiện tại).
- Nội dung (tính năng, bước, câu hỏi) là dữ liệu thuần trong `src/lib/landing-content.ts` → test được, dễ sửa chữ.
- Hình minh họa: "điện thoại mẫu" dựng bằng HTML/Tailwind với dữ liệu hư cấu (FR-L03) — không ảnh nhị phân, không
  dữ liệu thật.
- Bố cục trong cột 480px của root layout (spec Assumptions); một `<h1>` duy nhất; các phần dùng `<section>` +
  `<h2>`; câu hỏi thường gặp dùng `<details>/<summary>` (không cần JS, truy cập bàn phím được).

## R4. SEO của trang

- `metadata`: `title.absolute` "MemorySave — Nhật ký riêng tư, chia sẻ khoảnh khắc với người thân" (tiêu đề đầy đủ cho
  kết quả tìm kiếm), `description` riêng, `alternates.canonical: "/"`, `openGraph { ...OPEN_GRAPH_DEFAULTS, url: "/" }`
  (ảnh chung 003 do `src/app/opengraph-image.tsx` cấp).
- **JSON-LD** `WebApplication` (theo guide json-ld của Next: `<script type="application/ld+json">` trong page, escape
  `<` → `<`): `name`, `url`, `description`, `inLanguage: "vi"`, `applicationCategory: "LifestyleApplication"`,
  `operatingSystem: "Web"`, `isAccessibleForFree: true`, `offers { price: "0", priceCurrency: "VND" }`. Không dùng
  `FAQPage` (Google chỉ hiển thị kết quả FAQ cho trang chính phủ/y tế từ 2023 — thêm vào không lợi).
- `src/app/sitemap.ts`: `/` (priority 1, monthly), `/login` (0.5, yearly). `robots.ts` thêm `sitemap`.
- `/login`: `alternates.canonical: "/login"` (FR-L09).

## R5. Kiểm thử

- Unit: proxy (bổ sung ca `/`), `sitemap()`, `robots()` có sitemap, `landing-content` (đủ 4 tính năng/3 bước, JSON-LD
  đúng kiểu, không chứa `<` chưa escape), metadata trang giới thiệu (canonical, không noindex), `HOME_PATH`.
- Integration: cập nhật `google-login.test.ts` (người cũ/`next` không an toàn → `/camera`).
- Thủ công: 360px, Lighthouse SEO/Accessibility sau deploy (SC-003).
