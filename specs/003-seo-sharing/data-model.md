# Data Model: SEO cơ bản & xem trước khi chia sẻ link (003-seo-sharing)

**Không có thay đổi lược đồ, không migration.**

Dữ liệu được đọc (chỉ đọc):

| Nguồn | Trường | Dùng cho | Ràng buộc |
|---|---|---|---|
| [001 data-model](../001-daily-journal/data-model.md) › users | `invite_token` | tra người mời từ link `/add/<token>` | so khớp chính xác; không tìm thấy → thẻ chung (FR-S08) |
| 001 › users | `display_name` | tiêu đề + ảnh xem trước link mời | 1–50 ký tự (đã có); là dữ liệu duy nhất được đưa vào thẻ (FR-S09) |
| 001 › users | `id` | màu avatar trong ảnh (cùng thuật toán `avatarTone(seed)`) | không hiển thị ra ngoài |

Không bao giờ đọc vào thẻ/ảnh: `username`, `email` (trước 005 là `google_email`), `email_verified_at`, `google_sub`,
`password_hash`, token khác.

Trạng thái tạm: cookie `ms_session` chỉ được kiểm tra **có/không** ở proxy (research R2), không giải mã, không tra DB.
