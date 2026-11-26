# Research: SEO cơ bản & xem trước khi chia sẻ link (003-seo-sharing)

Tài liệu tham chiếu: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`,
`…/01-metadata/{robots,opengraph-image,manifest,app-icons}.md`, `…/04-functions/{image-response,generate-metadata}.md`
(Next 16.4).

## R1. Vì sao trang riêng tư trả 200

- Layout `(app)` bọc `BottomNav` trong `<Suspense>` để không chặn điều hướng (001). Next bắt đầu stream HTML ngay; khi
  page gọi `redirect("/login")` thì header đã gửi → Next chỉ còn cách nhúng `NEXT_REDIRECT` để client tự chuyển. Kiểm
  chứng production 2026-11-26: `GET /` và `/me` chưa đăng nhập → `200` + `NEXT_REDIRECT;replace;/login;307`.

## R2. Chuyển hướng sớm bằng `proxy.ts`

- **Decision**: `src/proxy.ts` (Next 16 đổi tên middleware → proxy, mặc định Node runtime). Nếu request tới trang riêng
  tư không có cookie `ms_session` (khác rỗng) → `NextResponse.redirect(/login?next=<path+query>, 307)`. `next` bỏ qua khi
  đường dẫn là `/`. Chỉ xét **có cookie** — không truy vấn DB (proxy nên nhẹ, docs: "should not rely on shared modules");
  phiên hết hạn vẫn do `requirePageUser()` xử lý như cũ (spec Edge Cases).
- **Matcher là danh sách cho phép tường minh**: `/`, `/journal/:path*`, `/moments/:path*`, `/me/:path*` — thay vì regex phủ
  định. Lý do: không vô tình chặn `/login`, `/add/…`, `/api/…`, `/_next/…`, `/robots.txt`, `/manifest.webmanifest`,
  `/icon/…`, `/apple-icon`, `/opengraph-image` (FR-S02). Test tự động liệt kê mọi `page.tsx` trong `src/app/(app)` và
  kiểm tra đều khớp matcher → thêm trang mới mà quên matcher thì test đỏ.
- Tên cookie tách ra `src/lib/session-cookie.ts` (không import `server-only`/DB) để proxy và `sessions.ts` dùng chung.
- **Alternatives**: bỏ `Suspense` ở layout (chậm điều hướng — đi ngược 001); kiểm tra phiên trong layout (cùng vấn đề stream).

## R3. robots.txt & noindex

- **Decision**: `src/app/robots.ts`: `allow: "/"`, `disallow: "/api/"`, không sitemap. Không chặn `/add/` và trang riêng
  tư trong robots.txt: (a) một số trình tạo xem trước (vd bot X/Twitter) tôn trọng robots.txt nên sẽ không đọc được thẻ OG;
  (b) chặn thu thập thì Google không thấy được thẻ noindex. Không lập chỉ mục được đảm bảo bằng `robots: { index: false,
  follow: false }` trong `src/app/(app)/layout.tsx` (metadata layout được kế thừa bởi page) + 307 ở R2.
- `/login`: thêm `description` riêng; giữ cho phép lập chỉ mục.

## R4. Địa chỉ tuyệt đối (`metadataBase`)

- **Decision**: `src/lib/site.ts › siteUrl()`: production Vercel → `https://${VERCEL_PROJECT_PRODUCTION_URL}`; preview →
  `https://${VERCEL_URL}`; còn lại `http://localhost:${PORT ?? 3000}`. Đặt `metadataBase` ở root layout. Không thêm biến
  môi trường mới (biến hệ thống Vercel có sẵn).

## R5. Open Graph

- **Decision**: root layout: `openGraph { siteName: "MemorySave", locale: "vi_VN", type: "website", title, description }`,
  `twitter { card: "summary_large_image" }`. Ảnh: `src/app/opengraph-image.tsx` (ảnh chung) và
  `src/app/add/[token]/opengraph-image.tsx` (ảnh riêng có tên người mời; token sai → vẽ ảnh chung, FR-S08).
- `/add/[token]` thêm `generateMetadata`: token hợp lệ → title `"<tên> mời bạn kết bạn trên MemorySave"`, mô tả mời; không
  hợp lệ → title `"Lời mời kết bạn · MemorySave"` + mô tả chung. Giữ `robots: { index: false }`. Chỉ dùng
  `displayName` (FR-S09). Tra token bằng hàm `inviterNameByToken` bọc `React.cache` để metadata + page + ảnh không lặp truy vấn
  trong cùng request. Không gọi `acceptInvite` (FR-041 001 giữ nguyên — xem trước không kết bạn).
- **Ảnh**: `ImageResponse` (`next/og`, có sẵn trong Next, không thêm dependency). Chỉ nhận ttf/otf/woff → dùng bản **woff**
  Be Vietnam Pro 900 (latin + latin-ext + vietnamese, ~31 KB) copy vào `assets/fonts/` và đọc bằng
  `readFile(join(process.cwd(), …))` như ví dụ trong docs (được Next trace khi build). Giới hạn bundle 500 KB → đạt
  (thêm độ đậm 600 cho chữ phụ: tổng 76 KB; giấy phép SIL OFL kèm ở `assets/fonts/OFL.txt`).
- **Phát hiện khi cài đặt (T018)**: Satori chỉ dùng **một** file cho mỗi cặp tên+độ đậm — nạp 3 bộ ký tự cùng tên "Be
  Vietnam Pro" làm mất chữ "ấ, ờ, ạ…". Cách đúng: mỗi bộ ký tự một tên riêng (`BVP-latin`, `BVP-vietnamese`,
  `BVP-latin-ext`) và khai báo `fontFamily` là danh sách dự phòng. Đã kiểm tra bằng mắt ảnh render.
- Bố cục (flexbox — Satori không hỗ trợ grid): nền kem `#FBF6EC` chấm bi, khung trắng viền đen 6px + bóng cứng, nhãn
  "MemorySave" nền lavender xoay nhẹ, avatar tròn chữ cái đầu (màu theo seed như `Avatar`), tên người mời cỡ lớn, dòng
  "mời bạn kết bạn". Tên dài: giới hạn 2 dòng bằng `lineClamp`, cỡ chữ giảm theo độ dài.
- Phần quyết định chữ (title, mô tả, cỡ chữ) là hàm thuần `src/lib/share-text.ts` → unit test.

## R6. Manifest & icon

- **Decision**: `src/app/manifest.ts` (name, short_name "MemorySave", start_url "/", display "standalone",
  background/theme `#FBF6EC`, lang "vi", icons `/icon/192`, `/icon/512`). `src/app/icon.tsx` với `generateImageMetadata`
  (id 192, 512) và `src/app/apple-icon.tsx` (180): ô vuông bo góc màu peach, viền đen, biểu tượng cuốn sổ (cùng path SVG
  với `BookIcon`). `favicon.ico` giữ nguyên.

## R7. Kiểm thử

- Unit: `proxy` (gọi hàm với `NextRequest`: không cookie → 307 + `next`; có cookie → pass; mọi page `(app)` khớp matcher;
  route công khai không khớp), `robots()`, `manifest()`, `share-text`.
- Integration (PGlite): `generateMetadata` của `/add/[token]` với token hợp lệ/sai — không lộ username/email; không tạo
  quan hệ bạn bè.
- Ảnh: render thử `opengraph-image` trong test (kiểm tra `content-type: image/png`, kích thước > 0) và xem bằng mắt một lần
  khi cài đặt; kiểm tra production bằng công cụ debug thẻ của Facebook/Zalo sau deploy (quickstart).
