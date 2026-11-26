# Feature Specification: Đăng nhập bằng Google

**Feature Branch**: `002-google-login`

**Created**: 2026-11-25

**Status**: Draft (rev 3 — trang Cá nhân `/me` không hiển thị cách đăng nhập; rev 2 — bỏ liên kết tài khoản cũ; người mới xác nhận tên hiển thị trước khi tạo tài khoản)

**Input**: User description: "Thêm tính năng đăng nhập bằng Google cho MemorySave. Người dùng có thể đăng
nhập/đăng ký bằng tài khoản Google bên cạnh cách đăng nhập bằng tên đăng nhập + mật khẩu hiện có. Luồng mời kết
bạn qua link (/add/...) phải tiếp tục hoạt động sau khi đăng nhập bằng Google. Nút Google chỉ hiện khi đã cấu
hình. Thông tin Google (email) chỉ chủ tài khoản thấy, không lộ cho bạn bè."
Rev 2: "Nếu đăng nhập bằng Google mà chưa tồn tại trong hệ thống thì cho nhập tên hiển thị (hoặc lấy luôn tên
Google trả về). Tài khoản cũ vẫn dùng user/pass bình thường, không cần liên kết."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Người mới vào app bằng Google (Priority: P1)

Một người chưa có tài khoản MemorySave mở trang đăng nhập, bấm "Tiếp tục với Google", chọn tài khoản Google
của mình và đồng ý. Quay lại MemorySave, họ thấy một bước ngắn "Bạn muốn bạn bè thấy tên gì?" với ô tên hiển thị
điền sẵn tên lấy từ Google. Họ giữ nguyên hoặc sửa rồi bấm "Bắt đầu" — tài khoản được tạo, mã định danh công
khai sinh từ tên đó, và họ vào trang chính. Lần sau bấm nút Google là vào thẳng tài khoản, không hỏi tên nữa.

**Why this priority**: Đây là lý do chính của tính năng — vào app không cần nghĩ tên đăng nhập và mật khẩu,
nhất là trên điện thoại. Chỉ riêng câu chuyện này đã mang lại giá trị.

**Independent Test**: Trên trình duyệt chưa đăng nhập, bấm nút Google, đồng ý; kiểm tra bước tên hiển thị có sẵn
tên Google; sửa thành "An Nguyễn", bấm Bắt đầu; kiểm tra trang Bạn bè hiện mã `an.nguyen.<số>`; đăng xuất, bấm
Google lần nữa và kiểm tra vào thẳng cùng tài khoản, không qua bước tên.

**Acceptance Scenarios**:

1. **Given** khách chưa đăng nhập và app đã được cấu hình Google, **When** mở trang đăng nhập,
   **Then** thấy nút "Tiếp tục với Google" bên cạnh form tên đăng nhập/mật khẩu.
2. **Given** tài khoản Google chưa có trong hệ thống, **When** khách đăng nhập Google thành công,
   **Then** họ thấy bước nhập tên hiển thị với giá trị điền sẵn từ tên Google; chưa có tài khoản nào được tạo.
3. **Given** khách ở bước tên hiển thị, **When** giữ nguyên hoặc nhập tên hợp lệ (1–50 ký tự) và bấm Bắt đầu,
   **Then** tài khoản được tạo với tên đó, mã định danh và link kết bạn sinh như đăng ký thường, và khách được đăng nhập.
4. **Given** khách ở bước tên hiển thị, **When** xóa trống tên rồi bấm Bắt đầu,
   **Then** thấy lỗi giống form đăng ký ("Hãy nhập tên hiển thị..."), tài khoản chưa được tạo.
5. **Given** tài khoản Google đã có trong hệ thống, **When** đăng nhập Google,
   **Then** vào thẳng đúng tài khoản đó, không qua bước tên, không tạo tài khoản mới.
6. **Given** khách bấm nút Google rồi hủy hoặc từ chối ở màn hình Google, **When** quay lại MemorySave,
   **Then** họ ở trang đăng nhập với thông báo tiếng Việt dễ hiểu và có thể thử lại hoặc dùng mật khẩu.
7. **Given** app chưa được cấu hình Google, **When** mở trang đăng nhập, **Then** không thấy nút Google;
   đăng nhập bằng mật khẩu vẫn hoạt động như cũ.

---

### User Story 2 - Nhận lời mời kết bạn bằng Google (Priority: P1)

Một người nhận được link kết bạn (`/add/...`) từ bạn mình, chưa có tài khoản. Họ mở link, được đưa tới trang
đăng nhập, chọn "Tiếp tục với Google", nhập tên hiển thị — sau khi xong, họ quay lại đúng link mời và trở thành
bạn của người gửi, không phải mở lại link.

**Why this priority**: Link mời là con đường chính để người mới vào app; nếu đăng nhập Google làm mất lời mời
thì tính năng gây hại nhiều hơn lợi.

**Independent Test**: Tài khoản A tạo link mời; ở trình duyệt khác chưa đăng nhập, mở link, chọn Google, đồng ý,
xác nhận tên; kiểm tra người mới và A đã là bạn của nhau.

**Acceptance Scenarios**:

1. **Given** khách chưa đăng nhập mở link kết bạn hợp lệ, **When** chọn Google, hoàn tất bước tên hiển thị,
   **Then** họ được đưa về trang của link mời và việc kết bạn diễn ra như với người đăng ký bằng mật khẩu.
2. **Given** người đã có tài khoản Google mở link kết bạn khi chưa đăng nhập, **When** đăng nhập Google,
   **Then** họ về thẳng trang link mời (không qua bước tên).
3. **Given** địa chỉ quay lại sau đăng nhập trỏ tới một trang web khác (không thuộc MemorySave),
   **When** đăng nhập Google xong, **Then** người dùng được đưa về trang chính của MemorySave, không bị chuyển ra ngoài.

---

### Edge Cases

- Tên trên Google trống, quá dài (> 50 ký tự): ô tên điền sẵn được cắt còn 50 ký tự; nếu trống thì để trống và người
  dùng phải tự nhập.
- Email Google chưa được Google xác minh: từ chối đăng nhập với thông báo.
- Người dùng bỏ dở ở bước tên hiển thị (đóng tab, để quá lâu): không tạo tài khoản; bước này hết hạn sau tối đa 10 phút,
  sau đó phải bấm lại nút Google.
- Người dùng mở trang quay về từ Google bằng link cũ, link bị sửa, hoặc ở trình duyệt khác với lúc bắt đầu:
  từ chối, không đăng nhập ai, đưa về trang đăng nhập với thông báo "thử lại".
- Người dùng đang đăng nhập mà mở trang đăng nhập: được chuyển về trang chính như hiện nay, không đổi tài khoản ngầm.
- Google tạm thời không phản hồi: báo lỗi tiếng Việt, không tạo tài khoản dở dang.
- Tài khoản tạo qua Google không có tên đăng nhập: trang Cá nhân (`/me`) không hiển thị cách đăng nhập cho bất kỳ loại
  tài khoản nào (rev 3).
- Bấm Bắt đầu hai lần, hoặc hai tab cùng hoàn tất bước tên cho cùng một tài khoản Google: chỉ đúng một tài khoản
  MemorySave được tạo; lần sau vào tài khoản đã tạo.
- Người có tài khoản mật khẩu cũ bấm nút Google: được coi là người mới và tạo một tài khoản riêng (xem Assumptions);
  bước tên hiển thị nhắc "Đã có tài khoản? Đăng nhập bằng tên đăng nhập và mật khẩu" để tránh tạo nhầm.

## Requirements *(mandatory)*

### Functional Requirements

**Đăng nhập & tạo tài khoản bằng Google**

- **FR-G01**: Khi app được cấu hình thông tin Google, trang đăng nhập MUST hiển thị nút "Tiếp tục với Google" ở cả
  chế độ Đăng nhập và Đăng ký; khi chưa cấu hình, nút MUST NOT hiển thị và luồng Google MUST trả về trang đăng nhập.
- **FR-G02**: Đăng nhập Google thành công với tài khoản Google đã có trong hệ thống MUST đăng nhập vào đúng tài khoản
  MemorySave đó, với cùng loại phiên và thời hạn như đăng nhập bằng mật khẩu (FR-002).
- **FR-G03**: Đăng nhập Google thành công với tài khoản Google chưa có trong hệ thống MUST đưa người dùng tới bước tên
  hiển thị, điền sẵn tên Google (cắt khoảng trắng, tối đa 50 ký tự). Tài khoản MUST chỉ được tạo khi người dùng xác nhận
  một tên hợp lệ theo cùng quy tắc với đăng ký thường (FR-001: bắt buộc, 1–50 ký tự); mã định danh (FR-037) và link kết
  bạn (FR-039) sinh như đăng ký thường; người dùng được đăng nhập ngay sau khi tạo.
- **FR-G04**: Mỗi tài khoản Google MUST ứng với tối đa một tài khoản MemorySave, nhận diện bằng mã tài khoản cố định của
  Google (không dựa vào email, vì email có thể đổi); email Google được lưu để chủ tài khoản biết mình đăng nhập bằng gì.
- **FR-G05**: Hệ thống MUST chỉ chấp nhận tài khoản Google có email đã được Google xác minh.
- **FR-G06**: Bước tên hiển thị MUST chỉ dùng được bởi chính trình duyệt vừa đăng nhập Google, trong tối đa 10 phút, và
  MUST NOT cho phép thay đổi tài khoản Google đã xác thực (người dùng chỉ chọn tên).

**An toàn luồng đăng nhập**

- **FR-G07**: Phản hồi quay về từ Google MUST được kiểm tra là thuộc đúng lượt đăng nhập do chính trình duyệt đó bắt
  đầu, trong thời gian giới hạn (tối đa 10 phút); nếu không khớp hoặc hết hạn MUST từ chối và không đăng nhập ai.
- **FR-G08**: Địa chỉ quay lại sau đăng nhập Google MUST được giữ qua toàn bộ luồng (kể cả bước tên hiển thị) và MUST
  tuân theo cùng quy tắc chỉ cho phép trang nội bộ như đăng nhập mật khẩu; địa chỉ không hợp lệ thay bằng trang chính.

**Quyền riêng tư**

- **FR-G09**: Email Google chỉ được trả cho chính chủ tài khoản (`GET /api/me`) và MUST NOT xuất hiện trong bất kỳ màn
  hình hay phản hồi nào gửi cho người khác (cùng mức bảo vệ như tên đăng nhập, FR-038). (rev 3: không còn hiển thị trên
  trang Cá nhân.)

**Tương thích**

- **FR-G10**: Đăng ký và đăng nhập bằng tên đăng nhập + mật khẩu, giới hạn đăng nhập sai (FR-003) và đăng xuất MUST hoạt
  động như trước; tài khoản cũ không cần và không có thao tác liên kết Google.
- **FR-G11**: Tài khoản tạo qua Google MUST NOT đăng nhập được bằng form mật khẩu.
- **FR-G12**: Tài khoản tạo qua Google MUST có đầy đủ chức năng như tài khoản thường: viết bài, đăng nhanh, kết bạn bằng
  mã hoặc link, chia sẻ; mọi quy tắc quyền riêng tư hiện có áp dụng y nguyên.
- **FR-G13**: Thay đổi dữ liệu tài khoản MUST không làm mất hoặc thay đổi tài khoản, bài viết, bạn bè hiện có.
- **FR-G14**: Mọi thông báo của luồng Google (hủy, lỗi, hết hạn) MUST bằng tiếng Việt và giao diện (gồm bước tên hiển
  thị) MUST dùng tốt trên điện thoại từ 360px.

### Key Entities

- **Người dùng (mở rộng)**: mỗi tài khoản có đúng một cách đăng nhập: (tên đăng nhập + mật khẩu) như hiện nay, hoặc
  Google. Tài khoản Google lưu mã tài khoản Google (duy nhất trên toàn hệ thống) và email Google (chỉ chủ tài khoản thấy);
  không có tên đăng nhập/mật khẩu.
- **Lượt đăng nhập Google**: thông tin tạm thời, ngắn hạn, gắn với trình duyệt đã bắt đầu luồng — gồm mã chống giả mạo và
  trang quay lại; bị hủy sau khi dùng hoặc hết hạn.
- **Đăng ký Google đang chờ**: kết quả Google đã xác thực nhưng chưa có tài khoản (mã tài khoản Google, email, tên gợi ý,
  trang quay lại), gắn với trình duyệt đó, hết hạn sau tối đa 10 phút hoặc khi tài khoản được tạo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người mới tạo được tài khoản bằng Google và vào trang chính trong dưới 30 giây; nếu giữ tên gợi ý thì không
  phải gõ ký tự nào.
- **SC-002**: 100% người mới mở link kết bạn rồi đăng ký bằng Google trở thành bạn của người gửi mà không phải mở lại link.
- **SC-003**: 0 trường hợp một tài khoản Google ứng với hai tài khoản MemorySave.
- **SC-004**: 0 màn hình/phản hồi dành cho người khác chứa email Google hoặc tên đăng nhập của một người dùng.
- **SC-005**: Toàn bộ tài khoản, bài viết và quan hệ bạn bè có trước khi ra mắt tính năng vẫn nguyên vẹn và đăng nhập
  bằng mật khẩu như cũ.
- **SC-006**: Mọi phản hồi Google giả mạo, dùng lại hoặc hết hạn, và mọi bước tên hiển thị hết hạn hoặc từ trình duyệt
  khác, đều bị từ chối (kiểm chứng bằng test tự động).

## Assumptions

- Chỉ hỗ trợ Google; các nhà cung cấp khác (Apple, Facebook...) nằm ngoài phạm vi.
- Không có liên kết/gỡ liên kết Google cho tài khoản mật khẩu cũ; người dùng cũ tiếp tục dùng tên đăng nhập + mật khẩu.
  Nếu họ bấm nút Google, đó là một tài khoản mới, tách biệt (app nhỏ, ít người dùng cũ, chấp nhận được).
- Không gộp tài khoản theo email vì tài khoản mật khẩu hiện không lưu email.
- Tài khoản tạo qua Google không đặt thêm được tên đăng nhập/mật khẩu trong phiên bản này.
- Người vận hành tự tạo thông tin ứng dụng Google và cấu hình cho từng môi trường (local, production); khi chưa cấu
  hình, app chạy như hiện nay.
- Ảnh đại diện Google không được dùng (app hiện không có ảnh đại diện).
- Tên hiển thị chỉ lấy từ Google làm gợi ý lúc tạo tài khoản; đổi tên trên Google sau đó không cập nhật vào MemorySave.
