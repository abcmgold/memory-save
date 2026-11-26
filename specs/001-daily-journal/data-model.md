# Data Model: MemorySave (001-daily-journal)

PostgreSQL (Neon) qua Drizzle. Thời điểm hệ thống (`*_at` trừ `event_at`) là `timestamptz`. ID là `uuid`
(`gen_random_uuid()`). Chuỗi là `text`. Ảnh nằm trên Cloudflare R2, DB chỉ lưu metadata.
Quyết định nền tảng: xem [research.md](./research.md) R3, R5–R8, R10.

## users

> **Mở rộng ở 002-google-login**: `username`/`password_hash` có thể null (tài khoản Google), thêm `google_sub`,
> `google_email` và bảng `pending_google_signups` — xem [002 data-model](../002-google-login/data-model.md).
>
> **Mở rộng ở 005-email-verification**: `google_email` đổi thành `email` (chỉ email đã xác thực, duy nhất) + `email_verified_at`;
> một tài khoản có thể vừa có mật khẩu vừa có Google; thêm bảng `email_codes`, `email_sends` — xem
> [005 data-model](../005-email-verification/data-model.md).

| Cột | Kiểu | Ràng buộc / ghi chú |
|---|---|---|
| id | uuid PK | |
| username | text | UNIQUE, `^[a-z0-9_]{3,30}$` (FR-001), lưu chữ thường |
| handle | text | UNIQUE, NOT NULL, `^[a-z0-9]+(\.[a-z0-9]+)*\.[0-9]{4,6}$`, ≤ 32 ký tự; mã định danh công khai, tự sinh lúc đăng ký, không đổi (FR-037). Tên đăng nhập KHÔNG bao giờ trả cho người khác (FR-038) |
| invite_token | text | UNIQUE, NOT NULL; 18 byte ngẫu nhiên dạng base64url (144 bit); thay mới khi "Tạo link mới" (FR-039) |
| display_name | text | NOT NULL, 1–50 ký tự (rev 3.1, FR-001); tài khoản cũ thiếu tên được điền bằng `handle` khi migrate |
| password_hash | text | Argon2id |
| last_audience | jsonb | `{"mode":"private"\|"friends"\|"custom","userIds":[...]}`; mặc định `{"mode":"private","userIds":[]}` (FR-027) |
| created_at | text | |

## sessions

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| token_hash | text PK | SHA-256 hex của token trong cookie |
| user_id | uuid FK → users.id | ON DELETE CASCADE |
| expires_at | text | 30 ngày, gia hạn trượt |
| created_at | text | |

## login_attempts

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| username | text | INDEX (username, attempted_at) |
| attempted_at | text | |

Quy tắc: ≥ 5 lần sai trong 15 phút gần nhất → từ chối đăng nhập (HTTP 429), kể cả mật khẩu đúng.
Đăng nhập thành công xóa các lần sai của username đó (FR-003).

## friend_requests

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| from_user_id | uuid FK → users.id | ON DELETE CASCADE |
| to_user_id | uuid FK → users.id | ON DELETE CASCADE; CHECK from ≠ to |
| created_at | text | |
| | | PK (from_user_id, to_user_id) |

## friendships

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| user_a_id | uuid FK → users.id | CHECK user_a_id < user_b_id |
| user_b_id | uuid FK → users.id | |
| created_at | text | |
| | | PK (user_a_id, user_b_id) |

### Chuyển trạng thái quan hệ giữa A và B

Thêm (rev 3): B mở link kết bạn hợp lệ của A → bạn bè ngay, xóa mọi lời mời giữa A và B (FR-040).

```text
không quan hệ ──A gửi──▶ lời mời A→B ──B đồng ý──▶ bạn bè
      ▲                    │  │                       │
      │        B từ chối / A hủy                      │ một bên hủy kết bạn
      └────────────────────┘  │                       ▼
                              │              không quan hệ (xóa mọi entry_audience A↔B)
   B gửi khi lời mời A→B đang chờ ──▶ bạn bè ngay (xóa cả hai lời mời)  (FR-023)
```

Gửi lời mời khi đã là bạn hoặc đã có lời mời cùng chiều → không tạo mới, trả trạng thái hiện tại.

## entries

| Cột | Kiểu | Ràng buộc / ghi chú |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK → users.id | ON DELETE CASCADE |
| title | text NULL | ≤ 200 ký tự (FR-005) |
| body | text NULL | ≤ 20.000 ký tự; với đăng nhanh: chú thích ≤ 200 (FR-020) |
| event_at | timestamp (không múi giờ), độ chính xác phút | giờ địa phương người viết chọn; không ở tương lai theo `APP_TIMEZONE` (FR-006) |
| event_date | date | GENERATED ALWAYS AS (`event_at::date`) STORED |
| kind | text | `journal` \| `quick` |
| audience_mode | text | `private` \| `friends` \| `custom` (chỉ để hiển thị; quyền thật nằm ở entry_audience) |
| created_at | text | |
| updated_at | text | |

Chỉ mục: `(owner_id, event_at DESC, created_at DESC, id DESC)`. CHECK: `kind IN ('journal','quick')`, `audience_mode IN ('private','friends','custom')`.
Ràng buộc nghiệp vụ (kiểm ở service, FR-007): ít nhất một trong title (sau trim), body (sau trim), ≥ 1 ảnh.

## photos

| Cột | Kiểu | Ràng buộc / ghi chú |
|---|---|---|
| id | uuid PK | cũng là tiền tố key trên R2: `photos/<id>/original`, `display.webp`, `thumb.webp` |
| uploader_id | uuid FK → users.id | ON DELETE CASCADE |
| entry_id | uuid NULL FK → entries.id | ON DELETE SET NULL (ảnh mồ côi được job dọn xóa object trên R2) |
| status | text | `uploading` → `pending` → `attached` (xem chuyển trạng thái bên dưới) |
| content_type | text | MIME khai báo lúc xin upload (để ký PUT); định dạng thật lấy theo nội dung ở `format` |
| position | integer | thứ tự trong bài, 0-based |
| format | text NULL | `jpeg` \| `png` \| `webp` \| `heif` (theo nội dung, FR-014) |
| bytes | integer | ≤ 10.485.760 (FR-015) |
| width / height | integer NULL | sau khi xoay theo EXIF |
| created_at | text | |

### Chuyển trạng thái ảnh

```text
POST /api/photos ──▶ uploading ──(client PUT lên R2, rồi POST .../complete: kiểm tra nội dung OK)──▶ pending
                         │                                     │ sai định dạng/kích thước
                         │                                     ▼
                         │                               xóa hàng + object (415/413)
pending ──(tạo/sửa bài kèm photoIds)──▶ attached ──(gỡ khỏi bài / xóa bài)──▶ xóa hàng + object
uploading|pending quá 24h ──(cron hằng ngày)──▶ xóa hàng + object
```

Quy tắc: tối đa 10 ảnh mỗi bài; chỉ gắn được ảnh `pending` của chính người tạo bài; mỗi user tối đa 30 ảnh
chưa gắn. Xóa object trên R2 thực hiện sau khi transaction DB thành công; nếu xóa R2 lỗi, job dọn hằng ngày
quét object không có hàng tương ứng (FR-009, FR-017).

## entry_audience

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| entry_id | uuid FK → entries.id | ON DELETE CASCADE |
| user_id | uuid FK → users.id | ON DELETE CASCADE |
| created_at | text | |
| | | PK (entry_id, user_id); INDEX (user_id, entry_id) |

Quy tắc ghi (FR-026, FR-028): `private` → không hàng nào; `friends` → một hàng cho mỗi người đang là bạn
tại thời điểm lưu; `custom` → các `userIds` được chọn, mỗi người MUST đang là bạn (ngược lại 422).
Khi sửa bài, tập audience được thay thế hoàn toàn.

## Quy tắc truy cập (module thuần `domain/access.ts`)

| Hành động | Được phép khi |
|---|---|
| Xem bài / ảnh của bài | viewer = chủ bài **hoặc** (có hàng `entry_audience(entry, viewer)` **và** viewer là bạn của chủ bài) |
| Sửa, xóa, gỡ ảnh, đổi người xem | viewer = chủ bài |
| Xem ảnh `uploading`/`pending` | viewer = người upload |
| Mọi trường hợp khác | từ chối, trả **404** (không lộ sự tồn tại, FR-031) |

## Truy vấn chính

- **Timeline của tôi**: `entries WHERE owner_id = me` theo thứ tự `event_at DESC, created_at DESC, id DESC`,
  keyset cursor, 20 bài/trang, kèm ảnh đầu tiên và số người xem.
- **Bảng "Bạn bè"**: `entries JOIN entry_audience ON user_id = me JOIN friendships(owner, me)` cùng thứ tự,
  kèm `display_name` của chủ bài.
- **Danh sách bạn**: hợp hai phía của `friendships` có chứa me.

## Migration rev 3.1

`0002`: `users.display_name` NOT NULL + CHECK 1–50 ký tự; hàng đang NULL/rỗng được điền bằng `handle` trước khi
bật ràng buộc (không mất dữ liệu).

## Migration rev 3

`0001`: thêm `users.handle` và `users.invite_token`. Tài khoản đã có được điền `handle = 'ban.' + 6 số`
(duy nhất) và `invite_token` ngẫu nhiên trước khi đặt NOT NULL + UNIQUE — không mất dữ liệu (constitution V).
