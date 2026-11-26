# Quickstart & kiểm chứng: SEO & chia sẻ (003-seo-sharing)

Không cần cấu hình mới. Chạy `npm run dev:local`.

## Test tự động

```bash
npm test && npm run typecheck && npm run lint
```

## Kiểm tra bằng lệnh (local hoặc production — thay `$B`)

```bash
B=http://localhost:3000
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $B/              # 307 → /login
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/journal?d=1" # 307 → /login?next=%2Fjournal%3Fd%3D1
curl -s -o /dev/null -w "%{http_code}\n" $B/login                         # 200
curl -s -o /dev/null -w "%{http_code}\n" $B/api/me                        # 401 (JSON, không chuyển hướng)
curl -s $B/robots.txt
curl -s $B/manifest.webmanifest
curl -s $B/login | grep -oE '<meta (property|name)="(og|twitter):[^>]*>'
curl -s $B/add/<token> | grep -oE '<title>[^<]*</title>|<meta property="og:(title|image)"[^>]*>'
```

## Kịch bản thủ công

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Chưa đăng nhập, mở link một bài nhật ký `/journal/<id>` | Vào thẳng trang đăng nhập (không chớp trang trống); đăng nhập xong về đúng bài (FR-S01, FR-S03) |
| 2 | Mở `/opengraph-image` và `/add/<token>/opengraph-image` trên trình duyệt | Ảnh 1200×630 phong cách app; tên có dấu hiển thị đúng |
| 3 | Sau deploy: dán link mời vào Zalo / Messenger, hoặc dùng developers.facebook.com/tools/debug | Thẻ có tiêu đề "<tên> mời bạn kết bạn…" và ảnh (SC-003) |
| 4 | Dán link mời sai | Thẻ chung MemorySave (FR-S08) |
| 5 | Android Chrome / iPhone Safari: "Thêm vào màn hình chính" | Icon MemorySave, tên MemorySave, mở toàn màn hình (SC-004) |
| 6 | Đã đăng nhập, dùng app bình thường | Không thay đổi gì (SC-005) |
