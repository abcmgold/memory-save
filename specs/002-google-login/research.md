# Research: Đăng nhập bằng Google (002-google-login)

Bối cảnh: MemorySave tự cài xác thực (Argon2id + bảng `sessions` + cookie `ms_session`, research 001 R4), không
dùng thư viện auth. Tính năng này thêm một cách đăng nhập nữa, giữ nguyên cơ chế phiên.

## R1. Giao thức & thư viện

- **Decision**: OpenID Connect "Authorization Code + PKCE" với Google, gọi thẳng hai endpoint
  (`https://accounts.google.com/o/oauth2/v2/auth`, `https://oauth2.googleapis.com/token`) bằng `fetch` có sẵn.
  **Không thêm dependency.** Scope `openid email profile`, `prompt=select_account`.
- **Rationale**: Nguyên tắc I — chỉ cần ~100 dòng; hệ thống phiên đã có, chỉ thiếu bước "Google xác nhận đây là ai".
  PKCE (S256) + `state` chống giả mạo/chèn mã (FR-G07).
- **Alternatives**: Auth.js/NextAuth (kéo theo mô hình phiên/adapter riêng, trùng với hệ thống đang có); Google
  Identity Services one-tap (script bên thứ ba trên trang, khó test, vẫn cần verify token chữ ký); `openid-client`
  (đúng chuẩn nhưng là dependency không cần thiết cho một nhà cung cấp).

## R2. Kiểm tra ID token

- **Decision**: Lấy `id_token` **trực tiếp từ token endpoint của Google qua HTTPS** bằng client secret, rồi giải mã
  phần payload và kiểm tra: `iss ∈ {https://accounts.google.com, accounts.google.com}`, `aud === GOOGLE_CLIENT_ID`,
  `exp > now` (cho lệch 60 giây), `sub` không rỗng, `email` có và `email_verified === true` (FR-G05). Không tự kiểm
  chữ ký JWKS.
- **Rationale**: OIDC Core §3.1.3.7 cho phép dùng xác thực TLS của token endpoint thay cho kiểm chữ ký khi token nhận
  trực tiếp từ nhà cung cấp trong luồng code (token không đi qua trình duyệt). Bỏ được phần tải/cache khóa JWKS.
- **Alternatives**: Kiểm chữ ký RS256 bằng JWKS (đúng nhưng thừa trong luồng này; cần cache khóa trên serverless).
- Logic kiểm tra claims là **hàm thuần** `domain/google-identity.ts` → unit test (Nguyên tắc III).

## R3. Trạng thái giữa "bắt đầu" và "callback"

- **Decision**: Cookie `ms_oauth` HttpOnly, `SameSite=Lax`, `Path=/api/auth/google`, `Max-Age=600`, `Secure` khi
  HTTPS, chứa JSON base64url `{ state, verifier, next }` (state 32 byte ngẫu nhiên, verifier 32 byte). Callback so
  `state` trong query với cookie bằng so sánh thời gian hằng, rồi **xóa cookie** (dùng một lần).
- **Rationale**: Gắn với đúng trình duyệt đã bắt đầu (FR-G07); `Lax` vẫn gửi kèm khi Google chuyển hướng GET về;
  không cần bảng DB hay bí mật ký vì giá trị chỉ có nghĩa khi khớp với `state` Google trả lại, và người dùng sửa cookie
  của chính mình không gây hại cho ai. `next` đi qua `safeNext()` cả lúc ghi lẫn lúc đọc (FR-G08).
- **Alternatives**: Bảng DB cho state (thêm ghi DB cho mỗi lần bấm nút); cookie ký HMAC (cần thêm biến môi trường bí mật).

## R4. Bước "chọn tên hiển thị" cho người mới

- **Decision**: Khi callback hợp lệ mà `google_sub` chưa có: ghi một dòng `pending_google_signups` (token băm SHA-256,
  `google_sub`, `email`, `suggested_name`, `next`, `expires_at = now + 10 phút`), đặt cookie `ms_gsignup` (token thô,
  HttpOnly, `SameSite=Lax`, `Path=/`, `Max-Age=600`) và chuyển tới trang `/login/google`. Trang đọc dòng chờ để điền
  sẵn tên; form gửi `POST /api/auth/google/complete { displayName }`. Server tạo user trong **một transaction** cùng
  việc xóa dòng chờ, rồi tạo phiên.
- **Rationale**: Danh tính Google phải do server giữ — client chỉ gửi tên (FR-G06). Dùng đúng mẫu "token thô trong
  cookie, băm trong DB" như `sessions`, không cần bí mật mới. Dọn dòng hết hạn bằng cron `cleanup` sẵn có.
- **Alternatives**: Tạo user ngay với tên Google rồi cho sửa tên sau (trái spec: tài khoản chỉ tạo khi xác nhận);
  cookie ký chứa danh tính (cần secret mới, khó thu hồi).

## R5. Tạo tài khoản trùng / đua nhau

- **Decision**: `users.google_sub` UNIQUE. Ở `complete`, nếu insert vi phạm `users_google_sub_unique` (hai tab cùng
  hoàn tất) → đọc user đã có và đăng nhập vào đó. Callback luôn tra `google_sub` trước; có rồi → tạo phiên luôn.
- **Rationale**: SC-003 được đảm bảo bởi ràng buộc DB, không phụ thuộc thứ tự request.

## R6. Mô hình tài khoản

- **Decision**: `users.username`, `users.password_hash` thành nullable; thêm `google_sub` (unique), `google_email`.
  CHECK `users_one_login_method`: hoặc (username, password_hash có; google_sub null) hoặc (google_sub có; username,
  password_hash null). Migration `0003` chỉ nới NOT NULL + thêm cột/ràng buộc — dữ liệu cũ thỏa nhánh đầu (FR-G13,
  Nguyên tắc V). Tài khoản Google không vào được form mật khẩu vì không có `username` (FR-G11); `authenticate()` vẫn
  chạy hash giả khi không tìm thấy, không lộ thông tin.
- **Alternatives**: Bảng `user_identities` riêng (linh hoạt cho nhiều nhà cung cấp/liên kết — spec đã bỏ liên kết, nên
  thừa); sinh username giả cho tài khoản Google (dữ liệu vô nghĩa, dễ bị nhầm là đăng nhập được).

## R7. Redirect URI & cấu hình

- **Decision**: `redirect_uri = <origin của request>/api/auth/google/callback` (dùng cùng logic `x-forwarded-host/proto`
  như `requestOrigin()`), và **dùng lại đúng giá trị đó** ở bước đổi mã. Biến môi trường tùy chọn
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; thiếu một trong hai → nút ẩn, `/api/auth/google/start` chuyển về
  `/login` (FR-G01). Người vận hành đăng ký URI cho `http://localhost:3000` và domain Vercel trong Google Cloud Console.
- **Rationale**: Không cần biến `APP_URL`; preview deploy của Vercel có domain khác nên chỉ hoạt động nếu được đăng ký
  (ghi trong DEPLOY.md).

## R8. Khả năng test

- **Decision**: Đổi mã lấy token qua một interface `GoogleOAuthClient { exchangeCode(code, verifier, redirectUri) }`;
  bản thật dùng `fetch`, test dùng bản giả trả claims dựng sẵn (giống `PhotoStore` giả). Integration test trên PGlite
  gọi thẳng Route Handler: start → callback (state đúng/sai/thiếu cookie/hết hạn) → complete (tên trống, hợp lệ, token
  hết hạn, cookie trình duyệt khác, hai lần complete) → `next` an toàn, kết bạn qua link vẫn chạy, email không lộ
  trong API của người khác.

## R9. Thông báo lỗi

- **Decision**: Lỗi trong luồng chuyển hướng (không phải JSON) → `302 /login?error=<mã>` với mã
  `google_cancelled` (người dùng hủy, `error=access_denied`), `google_failed` (state sai, hết hạn, Google lỗi),
  `google_unverified` (email chưa xác minh), `google_expired` (bước tên đã hết hạn). Trang đăng nhập ánh xạ mã → câu
  tiếng Việt trong `lib/messages.ts`; mã lạ bị bỏ qua.
