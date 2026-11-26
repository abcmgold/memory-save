# Quickstart & kiểm chứng: Đăng nhập bằng Google (002-google-login)

## Chuẩn bị (một lần)

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: loại External, tên "MemorySave", scope
   `openid`, `email`, `profile`. Ở chế độ Testing, thêm email người thử vào Test users.
2. **Credentials → Create OAuth client ID** → Web application. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://<domain-vercel>/api/auth/google/callback`
3. Thêm vào `.env.local` (và Vercel → Environment Variables):
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   ```
4. `npm run dev:local` (hoặc `npm run db:migrate && npm run dev`) — migration `0003` tự chạy.

## Test tự động

```bash
npm test          # unit: google-identity; integration: google-login (Google được giả lập, không cần mạng)
npm run typecheck
npm run lint
```

## Kịch bản thủ công

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Bỏ `GOOGLE_CLIENT_ID` khỏi env, mở `/login` | Không có nút Google; đăng nhập mật khẩu vẫn chạy (FR-G01, FR-G10) |
| 2 | Có env, trình duyệt ẩn danh, `/login` → "Tiếp tục với Google" → chọn tài khoản | Tới `/login/google`, ô tên điền sẵn tên Google, thấy email của mình |
| 3 | Xóa trống tên, bấm Bắt đầu | Lỗi "Hãy nhập tên hiển thị…", chưa có tài khoản |
| 4 | Nhập "An Nguyễn", bấm Bắt đầu | Vào trang chính; trang Bạn bè: mã `@an.nguyen.<số>`, dòng "Bạn đăng nhập bằng Google (email)…" |
| 5 | Đăng xuất → Google lại | Vào thẳng cùng tài khoản, không qua bước tên |
| 6 | Tài khoản A tạo link mời; trình duyệt ẩn danh khác mở link → Tạo tài khoản → Google → Bắt đầu | Về `/add/<token>` và thành bạn của A (US2) |
| 7 | Ở màn hình Google bấm Hủy | `/login` với thông báo đã hủy |
| 8 | Tới `/login/google`, chờ > 10 phút, bấm Bắt đầu | Về `/login` báo hết hạn, không tạo tài khoản |
| 9 | Tài khoản mật khẩu cũ đăng nhập như trước | Hoạt động, bài và bạn bè nguyên vẹn (SC-005) |
| 10 | Bạn của tài khoản Google xem danh sách bạn / bài được chia sẻ | Chỉ thấy tên hiển thị và mã, không thấy email (FR-G09) |
| 11 | Ở 360px, xem `/login` và `/login/google` | Không cuộn ngang, nút đủ lớn (FR-G14) |
