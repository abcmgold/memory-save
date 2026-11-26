# Quickstart & kiểm chứng: Trang giới thiệu (004-landing-page)

Không cần cấu hình mới. `npm run dev:local`.

## Test tự động

```bash
npm test && npm run typecheck && npm run lint
```

## Kiểm tra bằng lệnh

```bash
B=http://localhost:3000
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $B/                         # 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -b "ms_session=x" $B/       # 307 → /camera
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $B/camera                   # 307 → /login?next=%2Fcamera
curl -s $B/sitemap.xml
curl -s $B/robots.txt                                                                 # có dòng Sitemap:
curl -s $B/ | grep -oE '<title>[^<]*</title>|<link rel="canonical"[^>]*>|application/ld\+json|<h1'
```

## Kịch bản thủ công

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Ẩn danh mở `/` trên điện thoại 360px | Trang giới thiệu đủ phần, không cuộn ngang (FR-L02, FR-L10) |
| 2 | Bấm "Tạo tài khoản" | Form đăng ký; đăng ký xong vào `/camera` (SC-002, FR-L08) |
| 3 | Đã đăng nhập, gõ địa chỉ `/` | Vào thẳng màn Chụp ở `/camera` (FR-L07) |
| 4 | Bấm tab Chụp, nút "Về trang chính" ở link mời | Đều tới `/camera` |
| 5 | Mở app từ icon màn hình chính | `/camera` |
| 6 | Sau deploy: Lighthouse/PageSpeed cho `/` | SEO 100, Accessibility ≥ 95 (SC-003) |
| 7 | Sau deploy: Google Rich Results Test cho `/` | Nhận diện `WebApplication` |
