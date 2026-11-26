# Feature Specification: Trang giới thiệu công khai

**Feature Branch**: `004-landing-page`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Làm 1 trang giới thiệu ở `/` riêng; màn Chụp chuyển sang `/camera`. Lưu ý route là tiếng
Anh." (tiếp theo bản đánh giá SEO sau 003: nội dung công khai quá mỏng nên người lạ không tìm thấy MemorySave.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Người lạ hiểu MemorySave là gì và bắt đầu dùng (Priority: P1)

Một người tìm "nhật ký riêng tư chia sẻ với gia đình" hoặc được người quen nhắc tên MemorySave, mở trang chủ. Họ thấy
ngay MemorySave là gì, làm được gì, vì sao riêng tư, và bấm "Tạo tài khoản" / "Tiếp tục với Google" / "Đăng nhập" để
bắt đầu.

**Why this priority**: Đây là lý do của tính năng — có một trang công khai đủ nội dung để công cụ tìm kiếm hiểu và xếp
hạng, và để người mới quyết định dùng thử.

**Independent Test**: Trình duyệt ẩn danh mở `/` → thấy trang giới thiệu (mã 200, có tiêu đề, các phần nội dung, nút
đăng ký); bấm "Tạo tài khoản" → tới form đăng ký; trên điện thoại 360px không cuộn ngang.

**Acceptance Scenarios**:

1. **Given** chưa đăng nhập, **When** mở `/`, **Then** thấy trang giới thiệu: tiêu đề chính, mô tả ngắn, nút hành động
   (Tạo tài khoản, Đăng nhập, và Tiếp tục với Google khi đã cấu hình), các tính năng chính, cách bắt đầu, câu hỏi thường gặp.
2. **Given** trang giới thiệu, **When** bấm "Tạo tài khoản", **Then** tới trang đăng nhập ở chế độ đăng ký; "Đăng nhập" →
   chế độ đăng nhập; "Tiếp tục với Google" → luồng Google (002).
3. **Given** công cụ tìm kiếm, **When** đọc `/`, **Then** nhận trang 200 được phép lập chỉ mục, có tiêu đề, mô tả, địa chỉ
   chuẩn (canonical), dữ liệu có cấu trúc mô tả ứng dụng web, và thẻ xem trước khi chia sẻ.
4. **Given** công cụ tìm kiếm, **When** đọc sitemap, **Then** thấy trang chủ và trang đăng nhập.
5. **Given** trang giới thiệu, **Then** mọi hình minh họa là dữ liệu mẫu hư cấu — không có tên, ảnh hay nội dung của người
   dùng thật.

---

### User Story 2 - Người đã đăng nhập vào thẳng màn Chụp (Priority: P1)

Người đang dùng app mở `memory-save…/` (gõ địa chỉ, bookmark cũ, bấm logo) hoặc bấm tab "Chụp": họ vào màn Chụp ở
`/camera` như trước, không phải xem trang giới thiệu. Mở app từ icon ngoài màn hình chính cũng vào thẳng màn Chụp.

**Why this priority**: Không được làm chậm hay đổi thói quen của người dùng hiện có.

**Independent Test**: Đã đăng nhập, mở `/` → chuyển ngay sang `/camera`; tab Chụp trỏ `/camera`; đăng nhập xong (mật
khẩu hoặc Google, không có `next`) → `/camera`.

**Acceptance Scenarios**:

1. **Given** đã đăng nhập, **When** mở `/`, **Then** chuyển hướng tạm thời (307) tới `/camera`.
2. **Given** chưa đăng nhập, **When** mở `/camera`, **Then** 307 tới `/login?next=/camera` (như các trang riêng tư khác).
3. **Given** đăng nhập/đăng ký/hoàn tất Google mà không có `next`, **Then** về `/camera`.
4. **Given** thanh điều hướng, các nút "về trang chính" (trang mời kết bạn, Khoảnh khắc trống…), **Then** đều trỏ `/camera`.
5. **Given** "Thêm vào màn hình chính", **When** mở app từ icon, **Then** vào `/camera` (hoặc đăng nhập nếu chưa).

---

### Edge Cases

- Cookie phiên còn nhưng đã hết hạn: `/` chuyển sang `/camera`, trang này tự đưa về đăng nhập như hiện nay (chấp nhận).
- Ai đó bookmark `/` trước khi có thay đổi này: đã đăng nhập vẫn vào màn Chụp (qua chuyển hướng).
- Không còn route nào dùng tiếng Việt; không để lại đường dẫn cũ thừa trong mã.
- Trang giới thiệu phải nhẹ và nhanh: không truy vấn cơ sở dữ liệu, không phụ thuộc phiên.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-L01**: `/` MUST hiển thị trang giới thiệu công khai cho người chưa đăng nhập (mã 200, được phép lập chỉ mục).
- **FR-L02**: Trang giới thiệu MUST có: tiêu đề chính (h1) nêu rõ giá trị; mô tả; nút Tạo tài khoản, Đăng nhập, và
  Tiếp tục với Google khi đã cấu hình; 4 tính năng chính (nhật ký theo ngày có ảnh, chụp và đăng nhanh, chọn người xem
  từng bài, riêng tư mặc định); 3 bước bắt đầu; câu hỏi thường gặp; nút hành động cuối trang. Vị trí (theo yêu cầu
  2026-11-26): phần mở đầu chỉ có tiêu đề + mô tả; nút Đăng nhập ở thanh trên cùng; nút Tạo tài khoản / Google chỉ ở
  khung cuối trang.
- **FR-L03**: Hình minh họa MUST là dữ liệu mẫu hư cấu dựng bằng giao diện, không dùng dữ liệu/ảnh người dùng thật.
- **FR-L04**: Trang giới thiệu MUST có tiêu đề và mô tả riêng, địa chỉ chuẩn `/`, dữ liệu có cấu trúc kiểu ứng dụng web
  (tên, mô tả, ngôn ngữ vi, miễn phí), thẻ xem trước chia sẻ (dùng ảnh chung của 003).
- **FR-L05**: Site MUST có sitemap liệt kê `/` và `/login`; robots.txt MUST trỏ tới sitemap.
- **FR-L06**: Màn Chụp MUST chuyển sang `/camera` với hành vi không đổi; `/camera` là trang riêng tư (307 khi chưa đăng
  nhập, không lập chỉ mục).
- **FR-L07**: Người đã đăng nhập mở `/` MUST nhận 307 tới `/camera`.
- **FR-L08**: Mọi đích mặc định "trang chính" trong app (sau đăng nhập/đăng ký/Google, thanh điều hướng, các nút quay về)
  MUST là `/camera`; manifest MUST mở `/camera`.
- **FR-L09**: Trang đăng nhập MUST có địa chỉ chuẩn `/login` (gộp các biến thể `?next=`, `?error=`).
- **FR-L10**: Giao diện theo phong cách hiện có (neo-brutalism, tiếng Việt), dùng tốt từ 360px, không cuộn ngang.

### Key Entities

Không có dữ liệu mới.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trang chủ trả 200 với nội dung giới thiệu cho khách và công cụ tìm kiếm; 307 → `/camera` cho người đã đăng nhập.
- **SC-002**: Người mới đi từ trang chủ tới form đăng ký trong 1 lần bấm.
- **SC-003**: Trang chủ đạt điểm SEO tối đa và Accessibility ≥ 95 trên Lighthouse (đo sau deploy).
- **SC-004**: Toàn bộ test hiện có vẫn xanh; người dùng hiện có không thấy thay đổi nào ngoài địa chỉ màn Chụp.

## Assumptions

- Route tiếng Anh: `/` (giới thiệu), `/camera` (Chụp); chữ hiển thị tiếng Việt.
- Trang giới thiệu nằm trong cột rộng tối đa 480px như toàn bộ app (giữ đồng bộ thiết kế mobile-first); bản rộng cho
  máy tính để sau nếu cần.
- Người đã đăng nhập không xem được trang giới thiệu (luôn chuyển sang `/camera`) — chấp nhận được.
- Không có số liệu người dùng, đánh giá hay lời chứng thực (app nhỏ, tránh nội dung bịa).
