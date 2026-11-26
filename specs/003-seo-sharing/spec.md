# Feature Specification: SEO cơ bản & xem trước khi chia sẻ link

**Feature Branch**: `003-seo-sharing`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Từ bản phân tích SEO: (1) trang riêng tư trả chuyển hướng thật (307) thay vì trang 200
trống + robots.txt + noindex cho trang riêng tư; (2) Open Graph cho link mời kết bạn và toàn site; (3) manifest và
icon để thêm vào màn hình chính."

## Bối cảnh

MemorySave là app nhật ký riêng tư. Trang công khai duy nhất là trang đăng nhập; link mời kết bạn (`/add/...`) là
đường chính để người mới biết tới app, thường được gửi qua Zalo/Messenger/Facebook. Hiện tại: trang riêng tư khi chưa
đăng nhập trả về một trang trống với mã thành công rồi mới chuyển hướng bằng script (công cụ tìm kiếm có thể lập chỉ
mục trang trống "Chụp · MemorySave"); không có robots.txt; link chia sẻ không có tiêu đề/ảnh xem trước; không có
icon/tên khi thêm vào màn hình chính.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trang riêng tư không bị lập chỉ mục, chuyển hướng gọn (Priority: P1)

Một người (hoặc công cụ tìm kiếm, hoặc trình tạo xem trước link) mở thẳng một trang cần đăng nhập — trang chính,
Nhật ký, Khoảnh khắc, Cá nhân… — khi chưa đăng nhập. Họ được chuyển ngay tới trang đăng nhập, không thấy một trang
trống thoáng qua; sau khi đăng nhập họ quay lại đúng trang đã mở. Công cụ tìm kiếm chỉ thấy trang đăng nhập là trang
công khai, không lập chỉ mục trang riêng tư nào.

**Why this priority**: Sửa lỗi gốc khiến Google có thể hiển thị "Chụp · MemorySave" trống làm trang chủ; đồng thời cải
thiện trải nghiệm mở link sâu (vd link một bài nhật ký) khi chưa đăng nhập.

**Independent Test**: Chưa đăng nhập, gọi `/`, `/journal`, `/me`, `/moments`, một link bài nhật ký → nhận chuyển hướng
tạm thời tới `/login?next=<đường dẫn>`, không có nội dung trang; mở `/robots.txt` thấy quy tắc; đăng nhập xong quay về
đúng trang.

**Acceptance Scenarios**:

1. **Given** chưa đăng nhập, **When** yêu cầu bất kỳ trang cần đăng nhập, **Then** phản hồi là chuyển hướng tạm thời
   (307) tới `/login?next=<đường dẫn gốc kèm query>` và không chứa nội dung trang.
2. **Given** chưa đăng nhập và bị chuyển tới `/login?next=/journal/<id>`, **When** đăng nhập thành công (mật khẩu hoặc
   Google), **Then** về đúng `/journal/<id>`.
3. **Given** đã đăng nhập, **When** mở các trang đó, **Then** hoạt động như hiện tại, không chuyển hướng thừa.
4. **Given** công cụ tìm kiếm, **When** đọc `/robots.txt`, **Then** được phép thu thập trang công khai, không được thu
   thập các API.
5. **Given** bất kỳ trang cần đăng nhập nào được hiển thị (cho người đã đăng nhập), **Then** trang đó khai báo không
   cho lập chỉ mục.
6. **Given** trang đăng nhập, **Then** được phép lập chỉ mục, có tiêu đề và mô tả riêng.

---

### User Story 2 - Link mời hiện xem trước đẹp khi chia sẻ (Priority: P1)

Người dùng sao chép link kết bạn ở tab Cá nhân và gửi qua Zalo/Messenger. Ở khung chat, link hiện thẻ xem trước gồm
tiêu đề "<Tên hiển thị> mời bạn kết bạn trên MemorySave", một câu mô tả ngắn và một ảnh theo phong cách của app có tên
người mời. Link trang đăng nhập/trang chủ khi chia sẻ cũng hiện thẻ xem trước chung của MemorySave.

**Why this priority**: Link mời là con đường tăng người dùng; thẻ xem trước có tên người quen và hình ảnh tăng khả năng
người nhận bấm vào.

**Independent Test**: Dùng công cụ kiểm tra thẻ xem trước (hoặc đọc HTML) cho `/add/<token hợp lệ>`, `/add/<token
sai>` và `/login`; kiểm tra tiêu đề, mô tả, ảnh 1200×630 hiển thị đúng tên tiếng Việt có dấu.

**Acceptance Scenarios**:

1. **Given** link mời hợp lệ của "Bùi Tuấn", **When** ứng dụng nhắn tin tạo xem trước, **Then** tiêu đề là "Bùi Tuấn mời
   bạn kết bạn trên MemorySave", có mô tả và ảnh xem trước chứa tên "Bùi Tuấn" với dấu tiếng Việt hiển thị đúng.
2. **Given** link mời không hợp lệ hoặc đã đổi, **When** tạo xem trước, **Then** hiện thẻ chung của MemorySave, không
   tiết lộ link có từng tồn tại hay thuộc về ai.
3. **Given** trình tạo xem trước mở link mời, **Then** không có kết bạn nào xảy ra (giữ FR-041 của 001) và trang mời vẫn
   không được lập chỉ mục.
4. **Given** link trang đăng nhập hoặc trang chủ, **When** chia sẻ, **Then** hiện thẻ chung: tên MemorySave, mô tả, ảnh
   thương hiệu.

---

### User Story 3 - Thêm vào màn hình chính có icon và tên đẹp (Priority: P3)

Trên điện thoại, người dùng chọn "Thêm vào màn hình chính". App hiện với icon riêng của MemorySave và tên "MemorySave",
mở ra toàn màn hình (không thanh địa chỉ) với màu nền của app.

**Why this priority**: Tăng cảm giác "app thật" và giúp quay lại hằng ngày, nhưng không chặn tính năng nào.

**Independent Test**: Trên iPhone (Safari) và Android (Chrome), thêm vào màn hình chính; kiểm tra icon, tên, mở ở chế độ
toàn màn hình.

**Acceptance Scenarios**:

1. **Given** Android Chrome, **When** thêm vào màn hình chính, **Then** icon MemorySave (không phải ảnh chụp trang), tên
   "MemorySave", mở dạng ứng dụng độc lập với màu nền kem.
2. **Given** iPhone Safari, **When** thêm vào màn hình chính, **Then** icon MemorySave sắc nét.

---

### Edge Cases

- Cookie phiên còn nhưng đã hết hạn/không hợp lệ: không có cách kiểm tra rẻ ở bước chuyển hướng sớm; trang vẫn tự chuyển
  về đăng nhập như hiện nay (chấp nhận, hiếm gặp).
- Đường dẫn `next` dài bất thường hoặc trỏ ra ngoài: áp dụng quy tắc chỉ trang nội bộ hiện có.
- API (`/api/...`) chưa đăng nhập: giữ nguyên phản hồi lỗi 401 dạng JSON, không chuyển hướng.
- Trang công khai (`/login`, `/login/google`, `/add/...`), file tĩnh, icon, ảnh xem trước, robots, manifest: không bị chặn
  bởi bước chuyển hướng.
- Tên người mời rất dài: ảnh xem trước tự xuống dòng/cắt gọn, không tràn khung.
- Trình tạo xem trước gọi link mời nhiều lần: không phát sinh dữ liệu.

## Requirements *(mandatory)*

### Functional Requirements

**Chuyển hướng & lập chỉ mục**

- **FR-S01**: Yêu cầu tới mọi trang cần đăng nhập khi trình duyệt không có phiên MUST nhận chuyển hướng tạm thời (307)
  tới `/login?next=<đường dẫn + query>` trước khi bất kỳ nội dung trang nào được gửi.
- **FR-S02**: Trang công khai, API, file tĩnh và file metadata (icon, ảnh xem trước, robots, manifest) MUST NOT bị bước
  chuyển hướng này ảnh hưởng; API vẫn trả 401 JSON như cũ.
- **FR-S03**: Sau đăng nhập (mật khẩu hoặc Google), người dùng MUST quay về trang `next` hợp lệ.
- **FR-S04**: Site MUST có robots.txt cho phép thu thập trang công khai và chặn `/api/`.
- **FR-S05**: Mọi trang cần đăng nhập MUST khai báo không lập chỉ mục; `/add/...` và `/login/google` giữ không lập chỉ
  mục; `/login` MUST được phép lập chỉ mục với tiêu đề và mô tả riêng.

**Xem trước khi chia sẻ**

- **FR-S06**: Mọi trang MUST có thông tin xem trước chung: tên site "MemorySave", ngôn ngữ tiếng Việt, tiêu đề, mô tả,
  ảnh 1200×630 theo phong cách giao diện của app; đường dẫn trong thẻ MUST là địa chỉ tuyệt đối của site.
- **FR-S07**: Link mời hợp lệ MUST có tiêu đề "<tên hiển thị người mời> mời bạn kết bạn trên MemorySave", mô tả ngắn và
  ảnh xem trước riêng chứa tên người mời; chữ tiếng Việt có dấu MUST hiển thị đúng.
- **FR-S08**: Link mời không hợp lệ MUST dùng thẻ chung, không tiết lộ thông tin nào về token.
- **FR-S09**: Thẻ xem trước chỉ được dùng tên hiển thị của người mời (thông tin vốn hiện trên trang mời, FR-041) — MUST
  NOT chứa tên đăng nhập, email, token hay dữ liệu riêng tư khác.

**Thêm vào màn hình chính**

- **FR-S10**: Site MUST có manifest: tên "MemorySave", tên ngắn, mở từ trang chính, hiển thị độc lập, màu nền/màu chủ đề
  của app, ngôn ngữ tiếng Việt, icon 192 và 512 px.
- **FR-S11**: Site MUST có icon cho iOS (180 px) theo phong cách app.

### Key Entities

Không có dữ liệu mới. Dùng lại: người dùng (tên hiển thị) và token link mời (001).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% trang cần đăng nhập trả chuyển hướng 307 khi không có phiên (kiểm chứng bằng test tự động và gọi thử
  production).
- **SC-002**: Công cụ tìm kiếm chỉ có thể lập chỉ mục trang đăng nhập; 0 trang riêng tư được phép lập chỉ mục.
- **SC-003**: Link mời dán vào Zalo/Messenger/Facebook hiện tiêu đề có tên người mời và ảnh xem trước.
- **SC-004**: Thêm vào màn hình chính trên Android/iOS hiện icon và tên MemorySave.
- **SC-005**: Không trang hay chức năng nào hiện có thay đổi hành vi với người đã đăng nhập (toàn bộ test hiện có vẫn xanh).

## Assumptions

- Không làm trang giới thiệu công khai ở `/` và không cần sitemap (chỉ một trang công khai) — ngoài phạm vi.
- Bước chuyển hướng sớm chỉ xét có/không có cookie phiên (không truy vấn cơ sở dữ liệu); phiên hết hạn vẫn được trang
  tự xử lý như hiện nay.
- Không chặn `/add/` trong robots.txt vì một số trình tạo xem trước tôn trọng robots.txt và sẽ không đọc được thẻ; việc
  không lập chỉ mục do thẻ noindex đảm nhiệm.
- Ảnh xem trước và icon được tạo bằng mã theo phong cách hiện có (nền kem, viền đen, chữ đậm), không cần thiết kế riêng.
- Tên miền production đọc từ cấu hình triển khai; local dùng `http://localhost:3000`.
