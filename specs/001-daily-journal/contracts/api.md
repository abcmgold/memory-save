# HTTP API Contract: MemorySave (001-daily-journal)

Base: cùng origin với app. JSON UTF-8 trừ khi ghi khác. Mọi endpoint trừ `/api/auth/register`,
`/api/auth/login` yêu cầu cookie phiên `ms_session`; thiếu/hết hạn → `401`.
Mọi request ghi (POST/PATCH/PUT/DELETE) MUST có header `Origin` trùng host, ngược lại `403`.

**Lỗi** (mọi endpoint): `{ "error": { "code": "<MÃ>", "message": "<tiếng Việt>", "fields"?: { "<field>": "<thông báo>" } } }`

| HTTP | code | Khi nào |
|---|---|---|
| 400 | `VALIDATION` | body/query sai định dạng, vượt độ dài, ngày giờ tương lai, bài trống |
| 401 | `UNAUTHENTICATED` | chưa đăng nhập |
| 403 | `BAD_ORIGIN` | Origin không hợp lệ |
| 404 | `NOT_FOUND` | không tồn tại **hoặc không có quyền** (không phân biệt) |
| 409 | `CONFLICT` | username đã tồn tại |
| 413 | `TOO_LARGE` | ảnh > 10 MB |
| 415 | `UNSUPPORTED_TYPE` | không phải JPEG/PNG/WebP/HEIC theo nội dung |
| 422 | `RULE` | vi phạm quy tắc nghiệp vụ (quá 10 ảnh, chọn người không phải bạn, tự kết bạn với mình, username không tồn tại khi gửi lời mời) |
| 429 | `RATE_LIMITED` | đăng nhập sai quá 5 lần / 15 phút |

## Kiểu dùng chung

```ts
type UserRef   = { id: string; handle: string; displayName: string };   // rev 3: never the username (FR-038)
type PhotoRef  = { id: string; width: number; height: number;
                   thumbUrl: string; displayUrl: string };   // /api/photos/:id/thumb|display
type Audience  = { mode: "private" | "friends" | "custom"; users: UserRef[] };   // chỉ chủ bài thấy
type Entry = {
  id: string; title: string | null; body: string | null;
  eventAt: string;            // "YYYY-MM-DDTHH:mm" giờ địa phương
  kind: "journal" | "quick";
  author: UserRef;
  photos: PhotoRef[];
  isOwner: boolean;
  audience?: Audience;        // chỉ có khi isOwner
  createdAt: string; updatedAt: string;
};
type Page<T> = { items: T[]; nextCursor: string | null };
```

## Xác thực

| Method & path | Body | Thành công |
|---|---|---|
| `POST /api/auth/register` | `{ username, password, displayName }` — `displayName` bắt buộc, 1–50 ký tự | `201 { user: UserRef }` + Set-Cookie |
| `POST /api/auth/login` | `{ username, password }` | `200 { user: UserRef }` + Set-Cookie; sai → `401 INVALID_CREDENTIALS` (cùng thông báo cho sai tên hay sai mật khẩu) |
| `POST /api/auth/logout` | — | `204`, xóa phiên + cookie |
| `GET /api/me` | — | `200 { user: UserRef, username: string, lastAudience: { mode, userIds } }` — `username` chỉ trả cho chính chủ |

## Ảnh (tải thẳng lên R2 — research R5, R6)

| Method & path | Body | Thành công |
|---|---|---|
| `POST /api/photos` | `{ contentType: "image/jpeg"\|"image/png"\|"image/webp"\|"image/heic"\|"image/heif", size: number }` | `201 { photoId, upload: { url, method: "PUT", headers: { "Content-Type" }, expiresAt } }`; `size` > 10 MB → `413`; loại khác → `415`; > 30 ảnh chưa gắn → `422` |
| *(client)* `PUT <upload.url>` | byte của file, đúng `Content-Type` được trả (`Content-Length` đã được ký, trình duyệt tự gửi) | `200` từ R2; header khác/kích thước khác → R2 từ chối |
| `POST /api/photos/:id/complete` | — | `200 { photo: PhotoRef }` (trạng thái pending); nội dung không phải ảnh hỗ trợ → `415` và ảnh bị xóa; chưa upload → `422` |
| `GET /api/photos/:id/:variant` | `variant` ∈ `thumb` \| `display` \| `original` | có quyền → `302 Location: <presigned GET URL, hạn 60s>` + `Cache-Control: private, no-store`; không có quyền/không tồn tại → `404` |
| `DELETE /api/photos/:id` | — | `204`; chỉ ảnh chưa gắn bài của mình (ảnh đã gắn bài thì gỡ qua PATCH bài) |

## Cron

| Method & path | Header | Thành công |
|---|---|---|
| `GET /api/cron/cleanup` | `Authorization: Bearer <CRON_SECRET>` (Vercel Cron tự gửi) | `200 { removedPhotos, removedSessions, removedLoginAttempts }`; sai secret → `401`. Lịch: mỗi ngày một lần (`vercel.json`) |

## Bài nhật ký

| Method & path | Body / query | Thành công |
|---|---|---|
| `POST /api/entries` | `{ title?, body?, eventAt?, kind, photoIds: string[], audience: { mode, userIds? } }` — `eventAt` thiếu = bây giờ | `201 { entry: Entry }`; cập nhật `users.last_audience` |
| `GET /api/entries/:id` | — | `200 { entry: Entry }` hoặc `404` |
| `PATCH /api/entries/:id` | bất kỳ trường nào của POST; `photoIds` = danh sách đầy đủ theo thứ tự mới (ảnh bị bỏ khỏi danh sách sẽ bị xóa) | `200 { entry: Entry }`; chỉ chủ bài, khác → `404` |
| `DELETE /api/entries/:id` | — | `204`; chỉ chủ bài, xóa ảnh + quyền xem |
| `GET /api/entries?scope=mine` | `cursor?`, `date?` (`YYYY-MM-DD`, nhảy tới ngày) | `200 Page<Entry>` — timeline của tôi |
| `GET /api/entries?scope=friends` | `cursor?` | `200 Page<Entry>` — bảng "Bạn bè" (bài được chia sẻ với tôi) |

## Bạn bè

| Method & path | Body | Thành công |
|---|---|---|
| `GET /api/friends` | — | `200 { friends: UserRef[], incoming: UserRef[], outgoing: UserRef[] }` |
| `POST /api/friends/requests` | `{ handle }` (không phân biệt hoa thường, có thể kèm `@`) | `201 { status: "pending" }` hoặc `200 { status: "friends" }` (nếu bên kia đã mời mình, hoặc đã là bạn) hoặc `200 { status: "pending" }` (đã gửi trước đó) |
| `POST /api/friends/requests/:userId/accept` | — | `200 { status: "friends" }`; không có lời mời → `404` |
| `POST /api/friends/requests/:userId/decline` | — | `204` |
| `DELETE /api/friends/requests/:userId` | — | `204` (hủy lời mời mình đã gửi) |
| `DELETE /api/friends/:userId` | — | `204`; xóa quan hệ + mọi `entry_audience` giữa hai người theo cả hai chiều |

## Link kết bạn (rev 3, FR-039..FR-041)

| Method & path | Body | Thành công |
|---|---|---|
| `GET /api/friends/invite-link` | — | `200 { url: "<origin>/add/<token>" }` (của chính mình) |
| `POST /api/friends/invite-link` | — | `200 { url }` — tạo link mới, link cũ hết hiệu lực ngay |
| `GET /api/invites/:token` | — (không cần đăng nhập) | `200 { inviter: UserRef, status: "available" \| "self" \| "friends" \| "login_required" }`; token sai/cũ → `404` |
| `POST /api/invites/:token/accept` | — | `200 { status: "friends", inviter: UserRef }`; link của chính mình → `422`; token sai/cũ → `404` |

## Trang (UI routes)

| Route | Màn thiết kế | Ghi chú |
|---|---|---|
| `/login` | Đăng nhập / Đăng ký | đã đăng nhập → chuyển `/` |
| `/` | Camera (đăng nhanh) + bước Xem lại | màn mặc định sau đăng nhập |
| `/moments` | Khoảnh khắc | `scope=friends` |
| `/journal` | Nhật ký của tôi | `scope=mine`, `?date=` |
| `/journal/new` | Viết | |
| `/journal/[id]` | Chi tiết bài | bài của bạn bè cũng mở ở đây (chỉ đọc) |
| `/journal/[id]/edit` | Viết (chế độ sửa) | chỉ chủ bài |
| `/friends` | Bạn bè | hiện mã định danh của tôi + link kết bạn (sao chép / chia sẻ / tạo link mới) |
| `/add/[token]` | Nhận lời mời bằng link | không cần đăng nhập để xem; đã đăng nhập thì tự kết bạn; chưa thì dẫn tới `/login?next=/add/<token>` |

`/login` nhận `?next=` (chỉ đường dẫn nội bộ bắt đầu bằng `/`, không phải `//`). Mọi route trừ `/login` và `/add/[token]` chuyển hướng tới `/login` khi chưa đăng nhập.
