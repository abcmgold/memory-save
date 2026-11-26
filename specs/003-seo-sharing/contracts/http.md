# HTTP Contract: SEO & chia sẻ (003-seo-sharing)

## Chuyển hướng sớm (proxy)

Áp dụng cho: `/`, `/journal`, `/journal/*`, `/moments`, `/moments/*`, `/me`, `/me/*`.

| Request | Phản hồi |
|---|---|
| Không có cookie `ms_session` (hoặc rỗng), path `/` | `307 Location: /login` |
| Không có cookie, path khác | `307 Location: /login?next=<encodeURIComponent(path + search)>` |
| Có cookie | đi tiếp vào trang như hiện tại |

Không áp dụng cho: `/login*`, `/add/*`, `/api/*`, `/_next/*`, `/favicon.ico`, `/icon/*`, `/apple-icon*`,
`/opengraph-image*`, `/robots.txt`, `/manifest.webmanifest`.

## `GET /robots.txt`

```text
User-Agent: *
Allow: /
Disallow: /api/
```

## `GET /manifest.webmanifest`

```json
{ "name": "MemorySave", "short_name": "MemorySave", "description": "…", "lang": "vi", "start_url": "/",
  "display": "standalone", "background_color": "#fbf6ec", "theme_color": "#fbf6ec",
  "icons": [ { "src": "/icon/192", "sizes": "192x192", "type": "image/png" },
             { "src": "/icon/512", "sizes": "512x512", "type": "image/png", "purpose": "any" } ] }
```

## Thẻ `<head>`

| Trang | title | robots | og:image |
|---|---|---|---|
| Mọi trang (mặc định) | theo trang | — | `<site>/opengraph-image…` (1200×630 PNG) |
| `/login` | `Đăng nhập · MemorySave` + description riêng | index | ảnh chung |
| trang trong `(app)` | theo trang | `noindex, nofollow` | ảnh chung |
| `/add/<token hợp lệ>` | `<displayName> mời bạn kết bạn trên MemorySave` | `noindex` | `<site>/add/<token>/opengraph-image…` có tên người mời |
| `/add/<token sai>` | `Lời mời kết bạn · MemorySave` | `noindex` | ảnh chung (vẽ bởi route của `/add`) |

Luôn có: `og:site_name=MemorySave`, `og:locale=vi_VN`, `og:type=website`, `og:title`, `og:description`,
`twitter:card=summary_large_image`. `og:url` tuyệt đối trên hai trang được chia sẻ: `/login` và `/add/<token>` (trang
riêng tư không cần — người chưa đăng nhập luôn nhận 307). Không thẻ nào chứa username, email hay dữ liệu riêng tư.

## Icon

- `GET /icon/192`, `/icon/512` → PNG vuông; `GET /apple-icon` → PNG 180×180; `<link rel="apple-touch-icon">` tự sinh.
