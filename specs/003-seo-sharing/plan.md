# Implementation Plan: SEO cơ bản & xem trước khi chia sẻ link

**Branch**: `003-seo-sharing` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-seo-sharing/spec.md`

## Summary

Ba phần, không đổi dữ liệu: (1) `src/proxy.ts` trả **307 → `/login?next=…`** cho trang riêng tư khi không có cookie
phiên (sửa lỗi trang 200 trống do stream), `robots.ts`, `noindex` ở layout `(app)`; (2) `metadataBase` + Open Graph
chung ở root layout, ảnh OG sinh bằng `next/og` theo phong cách neo-brutalism với font Be Vietnam Pro (woff), và
`generateMetadata` + ảnh OG riêng cho `/add/[token]` có tên người mời; (3) `manifest.ts`, `icon.tsx` (192/512),
`apple-icon.tsx`. Chi tiết: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22 — như 001

**Primary Dependencies**: Không thêm. Next.js 16 (`proxy`, Metadata API, `next/og` `ImageResponse`), React 19

**Storage**: Không đổi. Đọc `users.display_name` theo `invite_token` (data-model.md)

**Testing**: Vitest — unit (`proxy`, `robots`, `manifest`, `share-text`), integration PGlite (`generateMetadata` của
`/add/[token]`), smoke render ảnh OG

**Target Platform**: Vercel (Node runtime); bot của Google, Facebook/Messenger, Zalo; iOS Safari 16+, Android Chrome

**Project Type**: Web application (một project Next.js full-stack)

**Performance Goals**: Chuyển hướng chưa đăng nhập không truy vấn DB (nhanh hơn hiện nay); ảnh OG render < 1 s

**Constraints**: `ImageResponse` chỉ flexbox, font ttf/otf/woff, bundle ≤ 500 KB; matcher proxy phải là hằng số; không
chặn route công khai/metadata (FR-S02)

**Scale/Scope**: 1 proxy, 6 file metadata/route mới, sửa 3 layout/page, 1 module chữ thuần

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Kết quả |
|---|---|---|
| **I. Đơn giản trước tiên** | Không dependency mới; dùng file convention có sẵn của Next; proxy chỉ đọc cookie. | ✅ PASS |
| **II. Riêng tư mặc định** | Thẻ/ảnh chỉ chứa `display_name` người mời — vốn đã hiện cho người có link (FR-041); không username/email. Proxy **không** thay thế kiểm tra quyền: mọi page/API vẫn `requirePageUser`/`requireUser` mỗi request (proxy chỉ là chuyển hướng sớm). Xem trước link không kết bạn. Trang riêng tư thêm noindex. | ✅ PASS |
| **III. Logic có test** | Test proxy gồm ca bị chuyển hướng và ca route công khai không bị chặn; test liệt kê mọi page `(app)` khớp matcher; test thẻ `/add` token sai không lộ gì. | ✅ PASS |
| **IV. Media an toàn** | Ảnh OG/icon sinh bằng mã, không dùng ảnh người dùng. | ✅ N/A |
| **V. Dữ liệu bền vững** | Không đổi lược đồ. | ✅ N/A |
| **Ràng buộc kỹ thuật** | Tiếng Việt (`og:locale vi_VN`, `lang vi`), không bí mật mới, chạy local không cần cấu hình. | ✅ PASS |

**Re-check sau Phase 1**: contract (bảng route áp dụng/không áp dụng proxy, thẻ theo trang) và data model (chỉ đọc
`display_name`) không thêm thành phần ngoài bảng trên → ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-seo-sharing/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/http.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
assets/fonts/                          # mới: Be Vietnam Pro 900 woff (latin, latin-ext, vietnamese) cho ImageResponse
src/
├── proxy.ts                           # mới: 307 → /login?next=… khi không có cookie phiên
├── lib/
│   ├── session-cookie.ts              # mới: SESSION_COOKIE dùng chung (proxy + sessions.ts)
│   ├── site.ts                        # mới: siteUrl() cho metadataBase
│   └── share-text.ts                  # mới, thuần: tiêu đề/mô tả/cỡ chữ cho thẻ chia sẻ
├── server/
│   ├── og/card.tsx                    # mới: bố cục ảnh OG + nạp font
│   ├── og/app-icon.tsx                # mới: bố cục icon
│   └── services/invites.ts            # + inviterNameByToken (cache)
│   └── services/sessions.ts           # import SESSION_COOKIE từ lib
└── app/
    ├── layout.tsx                     # + metadataBase, openGraph, twitter
    ├── robots.ts · manifest.ts        # mới
    ├── icon.tsx · apple-icon.tsx      # mới
    ├── opengraph-image.tsx            # mới: ảnh chung
    ├── (app)/layout.tsx               # + robots noindex
    ├── login/page.tsx                 # + description riêng
    └── add/[token]/page.tsx · opengraph-image.tsx   # + generateMetadata · ảnh riêng
tests/
├── unit/proxy.test.ts · unit/share-text.test.ts · unit/site-files.test.ts
└── integration/share-metadata.test.ts
```

**Structure Decision**: Giữ cấu trúc của 001/002; logic chữ thuần ở `src/lib`, phần vẽ ảnh ở `src/server/og`.

## Complexity Tracking

Không có vi phạm cần biện minh.
