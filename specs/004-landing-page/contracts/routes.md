# Routes Contract: Trang giới thiệu (004-landing-page)

Bổ sung/thay thế [003 contracts/http.md](../../003-seo-sharing/contracts/http.md) › Chuyển hướng sớm.

## Hành vi theo route

| Route | Chưa đăng nhập (không cookie) | Có cookie phiên |
|---|---|---|
| `/` | **200** trang giới thiệu (index) | **307 → `/camera`** |
| `/camera` (mới, thay `/`) | 307 → `/login?next=%2Fcamera` | màn Chụp (noindex) |
| `/journal…`, `/moments…`, `/me…` | 307 → `/login?next=…` | như cũ |
| `/login` | 200, canonical `/login` | trang tự chuyển tới `next` hoặc **`/camera`** |
| `/sitemap.xml` (mới) | 200 | 200 |

## Đích mặc định

Mọi chỗ trước đây mặc định về `/` (sau đăng nhập/đăng ký/Google, `BottomNav` "Chụp", nút quay về ở `/add/…` và
Khoảnh khắc trống, manifest `start_url`) → **`/camera`**.

## `GET /sitemap.xml`

```xml
<url><loc>{site}/</loc><changefreq>monthly</changefreq><priority>1</priority></url>
<url><loc>{site}/login</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>
```

`robots.txt` thêm dòng `Sitemap: {site}/sitemap.xml`.

## Thẻ `<head>` của `/`

- `<title>MemorySave — Nhật ký riêng tư, chia sẻ khoảnh khắc với người thân</title>`, `description` riêng
- `<link rel="canonical" href="{site}/">`, không có `robots noindex`
- `og:url={site}/`, `og:image` ảnh chung (003)
- `<script type="application/ld+json">` kiểu `WebApplication` (research R4)
- Đúng một `<h1>`
