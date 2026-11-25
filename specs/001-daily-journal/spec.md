# Feature Specification: MemorySave — nhật ký hằng ngày & chia sẻ khoảnh khắc với bạn bè

**Feature Branch**: `001-daily-journal`

**Created**: 2026-11-25

**Status**: Draft (rev 3.1 — tên hiển thị bắt buộc; rev 3: link mời kết bạn và mã định danh công khai)

**Input**: User description: "Trang web nhật ký cá nhân nhỏ: viết nhật ký có tiêu đề, nội dung, chọn
ngày giờ, đính kèm ảnh; xem lại theo timeline. Rev 2: làm giống kiểu Locket — người dùng kết bạn với
nhau, rồi chia sẻ nhật ký cho bạn bè, bạn bè xem được khoảnh khắc được chia sẻ. Không cần bình luận hay
cảm xúc (làm sau), chỉ chia sẻ và xem. Có tính năng đăng bài nhanh: chụp ảnh trực tiếp rồi đăng ngay.
Bỏ qua video (làm sau)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Viết nhật ký và xem lại theo timeline (Priority: P1)

Người dùng đăng ký, đăng nhập, viết bài nhật ký gồm tiêu đề, nội dung, ngày giờ xảy ra (mặc định là
bây giờ, có thể chọn lùi về quá khứ) và có thể đính kèm ảnh. Họ mở "Nhật ký của tôi" để xem các bài
của mình theo timeline nhóm theo ngày, mở chi tiết, sửa hoặc xóa.

**Why this priority**: Giá trị cốt lõi — ghi lại và đọc lại. Chỉ riêng câu chuyện này đã là một app
nhật ký cá nhân dùng được, chưa cần bạn bè.

**Independent Test**: Đăng ký tài khoản, tạo 3 bài với ngày giờ khác nhau (một bài lùi về tuần trước,
một bài kèm 2 ảnh), kiểm tra timeline đúng thứ tự và nhóm ngày; sửa một bài, xóa một bài, timeline cập nhật.

**Acceptance Scenarios**:

1. **Given** khách chưa có tài khoản, **When** đăng ký bằng tên đăng nhập và mật khẩu hợp lệ,
   **Then** tài khoản được tạo và họ được đăng nhập.
2. **Given** người dùng mở form viết bài, **When** form hiện ra, **Then** ngày giờ được điền sẵn là hiện tại.
3. **Given** người dùng nhập tiêu đề, nội dung, chọn hôm qua 20:30 và đính kèm 2 ảnh, **When** lưu,
   **Then** bài xuất hiện trong timeline dưới nhóm ngày hôm qua, đúng vị trí theo giờ, hiển thị ảnh thu nhỏ.
4. **Given** timeline có bài ở nhiều ngày, **When** xem timeline, **Then** nhóm ngày xếp mới nhất trước,
   trong mỗi ngày bài xếp theo giờ từ mới đến cũ.
5. **Given** người dùng xem chi tiết bài của mình, **When** sửa nội dung/ngày giờ/ảnh và lưu,
   **Then** thay đổi được lưu và vị trí trong timeline cập nhật.
6. **Given** người dùng xem chi tiết bài của mình, **When** chọn xóa và xác nhận, **Then** bài và ảnh
   đính kèm bị xóa, không còn trong timeline.
7. **Given** người dùng chọn một file không phải ảnh được hỗ trợ hoặc vượt giới hạn dung lượng,
   **When** đính kèm, **Then** file bị từ chối với thông báo nêu rõ lý do.

---

### User Story 2 - Đăng nhanh khoảnh khắc bằng camera (Priority: P2)

Từ màn hình chính, người dùng bấm một nút để mở camera ngay trong app, chụp ảnh, thêm một dòng chú
thích ngắn (tùy chọn), chọn ai được xem, rồi bấm đăng — tất cả trong vài giây. Bài đăng nhanh là một
bài nhật ký bình thường với ngày giờ là lúc chụp, xuất hiện trong timeline của chính họ.

**Why this priority**: Đây là cách ghi lại khoảnh khắc nhanh nhất, nhất là trên điện thoại; vẫn có giá
trị khi chưa có bạn bè (đăng ở chế độ "Chỉ mình tôi").

**Independent Test**: Trên điện thoại, bấm nút đăng nhanh, chụp ảnh bằng camera sau, đổi sang camera
trước chụp lại, thêm chú thích, chọn "Chỉ mình tôi", đăng; kiểm tra bài có ảnh vừa chụp xuất hiện đầu
timeline với ngày giờ là lúc chụp.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập ở màn hình chính, **When** bấm nút đăng nhanh, **Then** khung xem
   camera hiện ra ngay trong app (sau khi cấp quyền camera lần đầu).
2. **Given** khung camera đang mở, **When** người dùng đổi camera trước/sau và bấm chụp, **Then** ảnh vừa
   chụp hiện ra để xem lại, kèm lựa chọn chụp lại, ô chú thích và lựa chọn người xem.
3. **Given** ảnh đã chụp và người dùng nhập chú thích, **When** bấm đăng, **Then** bài được tạo với ảnh,
   chú thích làm nội dung, ngày giờ là lúc chụp, và đến được những người đã chọn.
4. **Given** người dùng từ chối quyền camera hoặc thiết bị không có camera, **When** bấm đăng nhanh,
   **Then** app giải thích ngắn gọn và cho phép chọn ảnh/chụp qua trình chọn ảnh của thiết bị thay thế.
5. **Given** người dùng đang ở bước xem lại ảnh, **When** bấm hủy, **Then** không có bài nào được tạo.

---

### User Story 3 - Kết bạn (Priority: P3)

Người dùng gửi lời mời kết bạn bằng cách nhập mã định danh của người khác (rev 3: thay cho tên đăng nhập, xem US5). Người nhận thấy lời mời
và chấp nhận hoặc từ chối. Hai người trở thành bạn bè khi lời mời được chấp nhận. Mỗi người xem được
danh sách bạn bè và có thể hủy kết bạn.

**Why this priority**: Là điều kiện để chia sẻ (US4), nhưng tự nó chưa mang lại nội dung để xem.

**Independent Test**: Với hai tài khoản A và B: A gửi lời mời tới B; B thấy lời mời và chấp nhận; cả hai
thấy nhau trong danh sách bạn bè; A hủy kết bạn; cả hai không còn trong danh sách của nhau.

**Acceptance Scenarios**:

1. **Given** A đã đăng nhập, **When** A nhập chính xác mã định danh của B và gửi lời mời,
   **Then** B thấy lời mời đang chờ (kèm tên hiển thị của A) và A thấy lời mời đã gửi đang chờ.
2. **Given** B có lời mời từ A, **When** B chấp nhận, **Then** A và B xuất hiện trong danh sách bạn bè của nhau.
3. **Given** B có lời mời từ A, **When** B từ chối, **Then** lời mời biến mất, A và B không là bạn, và A
   có thể gửi lại sau.
4. **Given** A nhập mã định danh không tồn tại hoặc mã của chính mình, **When** gửi lời mời,
   **Then** hệ thống báo lỗi rõ ràng.
5. **Given** A đã gửi lời mời cho B mà B cũng gửi lời mời cho A, **When** lời mời thứ hai được gửi,
   **Then** hai người trở thành bạn bè ngay.
6. **Given** A đã gửi lời mời đang chờ, **When** A hủy lời mời, **Then** lời mời biến mất khỏi phía B.
7. **Given** A và B là bạn, **When** A hủy kết bạn và xác nhận, **Then** cả hai không còn là bạn.

---

### User Story 4 - Chia sẻ khoảnh khắc và xem của bạn bè (Priority: P4)

Khi viết bài (thường hoặc đăng nhanh), người dùng chọn ai được xem: "Chỉ mình tôi", "Tất cả bạn bè",
hoặc chọn một số bạn cụ thể. Người được chia sẻ thấy bài trong bảng "Bạn bè" — dòng khoảnh khắc từ bạn
bè, mới nhất trước, kèm tên và ảnh của người đăng. Họ chỉ được xem, không sửa, xóa hay chia sẻ tiếp.
Chủ bài có thể đổi người xem bất kỳ lúc nào.

**Why this priority**: Hoàn thiện trải nghiệm chia sẻ, phụ thuộc vào US1/US2 (có bài) và US3 (có bạn).

**Independent Test**: A và B là bạn, C là bạn của A nhưng không phải B. A đăng bài "Chỉ mình tôi" — B, C
không thấy. A sửa thành chỉ chia sẻ cho B — B thấy trong bảng "Bạn bè" và xem được ảnh, C không thấy và
không mở được kể cả bằng đường dẫn. A bỏ B khỏi người xem — B không còn thấy. A chia sẻ cho B rồi hủy
kết bạn — B không còn thấy.

**Acceptance Scenarios**:

1. **Given** A tạo bài mà không đổi lựa chọn người xem lần đầu tiên, **When** lưu, **Then** bài ở chế độ
   "Chỉ mình tôi" và không ai khác thấy.
2. **Given** A có bạn B và C, **When** A đăng bài chọn "Tất cả bạn bè", **Then** bài xuất hiện trong bảng
   "Bạn bè" của B và C.
3. **Given** A có bạn B và C, **When** A đăng bài chỉ chọn B, **Then** chỉ B thấy bài; C mở đường dẫn của
   bài hoặc ảnh thì nhận "không tìm thấy".
4. **Given** B xem bài A chia sẻ, **When** B mở bài, **Then** B thấy ảnh, nội dung, ngày giờ và tên A,
   nhưng không có thao tác sửa/xóa/chia sẻ; mọi yêu cầu sửa/xóa từ B đều bị từ chối.
5. **Given** bài của A đang chia sẻ cho B, **When** A bỏ B khỏi danh sách người xem, **Then** lần mở tiếp
   theo của B (bài, ảnh, bảng "Bạn bè") không còn thấy bài.
6. **Given** A đã chia sẻ nhiều bài cho B, **When** A và B hủy kết bạn, **Then** B mất quyền xem mọi bài
   của A và ngược lại; nếu kết bạn lại, các bài cũ không tự hiện lại.
7. **Given** A đăng bài "Tất cả bạn bè" hôm qua và hôm nay mới kết bạn với D, **When** D mở bảng "Bạn bè",
   **Then** D không thấy bài hôm qua (chỉ thấy bài A chia sẻ sau khi đã là bạn hoặc được A thêm thủ công).
8. **Given** A sửa nội dung hoặc xóa bài đã chia sẻ, **When** B mở lại, **Then** B thấy bản mới nhất hoặc
   bài không còn.

---

### User Story 5 - Mời bạn bằng link và mã định danh (Priority: P5)

Mỗi người có một **mã định danh** công khai do hệ thống tự sinh từ tên hiển thị lúc đăng ký (ví dụ
`an.nguyen.4821`), cố định mãi. Người khác thêm bạn bằng mã này; **tên đăng nhập trở thành bí mật**, chỉ dùng để
đăng nhập và không bao giờ hiện cho người khác. Ngoài ra mỗi người có một **link kết bạn** để gửi qua tin nhắn:
ai mở link (sau khi đăng nhập hoặc đăng ký) sẽ tự động trở thành bạn của chủ link. Chủ link có thể tạo link mới
bất kỳ lúc nào để vô hiệu link cũ.

**Why this priority**: Kết bạn nhanh hơn (một chạm từ tin nhắn) và không lộ tên đăng nhập — giảm nguy cơ bị dò
mật khẩu theo tên đăng nhập.

**Independent Test**: A sao chép link kết bạn gửi cho B; B (chưa đăng nhập) mở link → đăng ký → tự động là bạn
của A. A tạo link mới; C mở link cũ → báo link không còn hiệu lực. C thêm A bằng mã định danh của A → lời mời
được gửi. Không màn hình hay phản hồi API nào cho B, C thấy tên đăng nhập của A.

**Acceptance Scenarios**:

1. **Given** khách đăng ký với tên hiển thị "An Nguyễn", **When** tài khoản được tạo, **Then** hệ thống sinh mã
   định danh duy nhất dạng `an.nguyen.<số>`; nếu tên hiển thị không có chữ cái/chữ số nào (vd chỉ có emoji)
   thì mã có dạng `ban.<số>`.
2. **Given** B đã đăng nhập, **When** B mở link kết bạn của A, **Then** trang hiện tên và mã định danh của A, hai
   người trở thành bạn ngay mà A không cần chấp nhận, và mọi lời mời đang chờ giữa hai người được xóa.
3. **Given** B chưa đăng nhập, **When** B mở link của A, **Then** B thấy tên của A cùng lựa chọn đăng nhập/đăng
   ký; sau khi xong, B quay lại link và tự động trở thành bạn của A.
4. **Given** A mở chính link của mình hoặc B đã là bạn của A, **When** link được mở, **Then** hệ thống báo trạng
   thái tương ứng và không tạo gì mới.
5. **Given** A bấm "Tạo link mới" và xác nhận, **When** ai đó mở link cũ, **Then** hệ thống báo link không còn
   hiệu lực.
6. **Given** C nhập mã định danh của A (không phân biệt hoa thường, có thể kèm `@`), **When** gửi lời mời, **Then**
   lời mời được gửi; nhập tên đăng nhập của A thay vì mã định danh thì báo không tìm thấy.

---

### Edge Cases

- Chọn ngày giờ trong tương lai → không cho lưu, báo "ngày giờ không được ở tương lai".
- Bài hoàn toàn trống (không tiêu đề, nội dung, ảnh) bị từ chối; bài chỉ có ảnh hoặc chỉ có chữ thì hợp lệ.
- Hai bài cùng ngày giờ → thứ tự ổn định, bài tạo sau xếp trên.
- Tải ảnh thất bại giữa chừng (mất mạng) khi đăng → thông báo lỗi, không tạo bài dở; ảnh vừa chụp và
  chú thích vẫn còn để thử lại.
- Chọn "Tất cả bạn bè" khi chưa có bạn nào → bài vẫn được lưu, thực tế chỉ mình tôi xem.
- Người dùng chọn bạn cụ thể rồi hủy kết bạn với người đó trước khi đăng → người đó không nhận được bài.
- Gửi lời mời cho người đã là bạn hoặc đã có lời mời đang chờ → không tạo trùng, báo trạng thái hiện tại.
- Phiên đăng nhập hết hạn khi đang viết → yêu cầu đăng nhập lại, không mất nội dung đang gõ.
- Đăng ký với tên đăng nhập đã tồn tại → báo lỗi; đăng nhập sai nhiều lần → tạm chặn thử lại.
- Timeline hoặc bảng "Bạn bè" rất dài → tải dần, trang vẫn mở nhanh.
- Ảnh chụp trên điện thoại bị xoay → hiển thị đúng chiều như khi chụp.

## Requirements *(mandatory)*

### Functional Requirements

**Tài khoản**

- **FR-001**: Hệ thống MUST cho phép đăng ký bằng tên đăng nhập duy nhất (3–30 ký tự: chữ thường không
  dấu, số, dấu gạch dưới), mật khẩu (tối thiểu 8 ký tự) và tên hiển thị **bắt buộc** (1–50 ký tự sau khi bỏ
  khoảng trắng đầu/cuối) — tên hiển thị là thứ bạn bè nhìn thấy, tên đăng nhập thì không (FR-038).
- **FR-002**: Hệ thống MUST cho phép đăng nhập, đăng xuất, giữ phiên đăng nhập giữa các lần mở trang
  đến khi đăng xuất hoặc hết hạn.
- **FR-003**: Hệ thống MUST tạm chặn đăng nhập một tài khoản sau 5 lần sai liên tiếp trong 15 phút.
- **FR-004**: Mọi trang và thao tác trừ đăng ký/đăng nhập MUST yêu cầu đã đăng nhập.

**Bài nhật ký**

- **FR-005**: Người dùng MUST tạo được bài với tiêu đề (tối đa 200 ký tự), nội dung nhiều dòng (tối đa
  20.000 ký tự), ngày giờ sự kiện, ảnh đính kèm và lựa chọn người xem.
- **FR-006**: Ngày giờ sự kiện MUST mặc định là hiện tại, cho phép chọn ngày giờ quá khứ (đến từng phút),
  MUST NOT cho phép tương lai.
- **FR-007**: Bài MUST có ít nhất một trong: tiêu đề, nội dung, hoặc một ảnh.
- **FR-008**: Chủ bài MUST sửa được tiêu đề, nội dung, ngày giờ, ảnh đính kèm và người xem.
- **FR-009**: Chủ bài MUST xóa được bài sau khi xác nhận; xóa bài MUST xóa ảnh đính kèm và mọi quyền xem của bài.

**Timeline "Nhật ký của tôi"**

- **FR-010**: Hệ thống MUST hiển thị các bài của chính người dùng, nhóm theo ngày (mới nhất trước), trong
  ngày sắp theo giờ giảm dần; cùng ngày giờ thì bài tạo sau đứng trước.
- **FR-011**: Mỗi mục MUST hiển thị giờ, tiêu đề (hoặc đoạn đầu nội dung), ảnh thu nhỏ đầu tiên nếu có,
  và biểu tượng cho biết bài đang riêng tư hay được chia sẻ.
- **FR-012**: Timeline MUST tải dần khi cuộn và cho phép nhảy tới một ngày cụ thể.

**Ảnh đính kèm**

- **FR-013**: Người dùng MUST đính kèm được nhiều ảnh vào bài từ thư viện ảnh hoặc chụp bằng camera thiết bị.
- **FR-014**: Hệ thống MUST chỉ chấp nhận ảnh JPEG, PNG, WebP, HEIC/HEIF; kiểm tra dựa trên nội dung file,
  không chỉ tên file. Video không được hỗ trợ trong phiên bản này.
- **FR-015**: Mỗi ảnh tối đa 10 MB, mỗi bài tối đa 10 ảnh; file vi phạm bị từ chối với thông báo nêu rõ giới hạn.
- **FR-016**: Trang chi tiết MUST hiển thị ảnh đúng chiều và cho bấm để xem lớn.
- **FR-017**: Chủ bài MUST gỡ được từng ảnh; ảnh đã gỡ MUST không còn truy cập được.

**Đăng nhanh**

- **FR-018**: Màn hình chính MUST có nút đăng nhanh luôn dễ thấy, mở khung camera trực tiếp trong app.
- **FR-019**: Khung camera MUST cho đổi camera trước/sau và chụp; sau khi chụp hiển thị ảnh để xem lại,
  chụp lại hoặc hủy.
- **FR-020**: Bước xem lại MUST có ô chú thích (tối đa 200 ký tự, tùy chọn) và lựa chọn người xem; bấm đăng
  tạo bài gồm 1 ảnh, chú thích làm nội dung, ngày giờ là lúc chụp.
- **FR-021**: Khi không dùng được camera trong app (bị từ chối quyền, không có camera, trình duyệt không hỗ
  trợ), hệ thống MUST cho phép chụp/chọn ảnh qua trình chọn ảnh của thiết bị.

**Bạn bè**

- **FR-022**: Người dùng MUST gửi được lời mời kết bạn bằng cách nhập chính xác mã định danh (FR-037); hệ thống
  MUST NOT cung cấp danh sách hay tìm kiếm toàn bộ người dùng.
- **FR-023**: Hệ thống MUST báo lỗi khi mã định danh không tồn tại hoặc là của chính mình; không tạo lời mời trùng; nếu hai
  người gửi lời mời cho nhau thì tự động thành bạn.
- **FR-024**: Người dùng MUST thấy lời mời đến và lời mời đã gửi đang chờ; chấp nhận hoặc từ chối lời mời
  đến; hủy lời mời đã gửi.
- **FR-025**: Người dùng MUST xem được danh sách bạn bè và hủy kết bạn (có xác nhận); quan hệ bạn bè là hai chiều.

**Chia sẻ và xem**

- **FR-026**: Mỗi bài MUST có lựa chọn người xem: "Chỉ mình tôi", "Tất cả bạn bè", hoặc một số bạn cụ thể.
  Chỉ có thể chọn người đang là bạn.
- **FR-027**: Lần đầu viết bài, người xem MUST mặc định là "Chỉ mình tôi"; các lần sau mặc định là lựa chọn
  người dùng đã dùng ở bài gần nhất, và lựa chọn luôn hiển thị rõ trước khi đăng.
- **FR-028**: "Tất cả bạn bè" MUST nghĩa là những người đang là bạn tại thời điểm lưu bài; bạn kết thêm sau
  không tự động thấy bài cũ.
- **FR-029**: Bảng "Bạn bè" MUST hiển thị các bài bạn bè chia sẻ với người dùng, mới nhất (theo ngày giờ sự
  kiện) trước, kèm tên hiển thị người đăng, ảnh và nội dung; tải dần khi cuộn.
- **FR-030**: Người được chia sẻ MUST chỉ xem được; MUST NOT sửa, xóa, gỡ ảnh hay chia sẻ tiếp.
- **FR-031**: Mọi yêu cầu xem bài hoặc ảnh từ người không phải chủ bài và không có quyền xem (kể cả khách
  chưa đăng nhập, kể cả qua đường dẫn trực tiếp đã lưu) MUST nhận kết quả "không tìm thấy".
- **FR-032**: Bỏ một người khỏi danh sách người xem, hoặc hủy kết bạn, MUST thu hồi quyền xem ngay ở yêu cầu
  tiếp theo; hủy kết bạn thu hồi quyền xem mọi bài giữa hai người theo cả hai chiều.

**Mã định danh và link kết bạn (rev 3)**

- **FR-037**: Khi đăng ký, hệ thống MUST tự sinh một mã định danh công khai, duy nhất, cố định mãi: phần chữ lấy
  từ tên hiển thị (bỏ dấu, chữ thường, các từ nối bằng dấu chấm, tối đa 20 ký tự; nếu tên không có chữ cái/chữ
  số nào thì là `ban`) cộng dấu chấm và 4–6 chữ số ngẫu nhiên. Người dùng không đổi được mã này.
- **FR-038**: Tên đăng nhập MUST chỉ dùng để đăng nhập và MUST NOT xuất hiện trong bất kỳ màn hình hay phản hồi
  API nào cho người dùng khác; ở mọi nơi hiển thị người khác (bạn bè, lời mời, bài chia sẻ) dùng tên hiển thị và
  mã định danh.
- **FR-039**: Mỗi người dùng MUST có đúng một link kết bạn đang hiệu lực, chứa mã bí mật khó đoán (≥ 128 bit
  ngẫu nhiên); người dùng xem, sao chép hoặc chia sẻ được link này và có thể tạo link mới (có xác nhận), khi đó
  link cũ hết hiệu lực ngay.
- **FR-040**: Người dùng đã đăng nhập mở link kết bạn hợp lệ của người khác MUST tự động trở thành bạn của chủ link
  (không cần chủ link chấp nhận), xóa mọi lời mời đang chờ giữa hai người; mở link của chính mình, link khi đã là
  bạn, hoặc link không hợp lệ/đã đổi MUST hiện thông báo tương ứng và không thay đổi gì.
- **FR-041**: Người chưa đăng nhập mở link kết bạn MUST thấy tên hiển thị và mã định danh của chủ link, được đưa
  tới đăng nhập/đăng ký và sau đó quay lại link để hoàn tất kết bạn. Việc kết bạn chỉ xảy ra khi người mở link đã
  đăng nhập trong trình duyệt (trình tạo xem trước link của ứng dụng nhắn tin không được làm phát sinh kết bạn).

**Giao diện và dữ liệu**

- **FR-033**: Giao diện và thông báo MUST bằng tiếng Việt; ngày giờ theo định dạng Việt Nam
  (ví dụ "Thứ Ba, 25/11/2026", "20:30").
- **FR-034**: Giao diện MUST dùng tốt trên điện thoại từ 360px và trên máy tính, không cuộn ngang; điều hướng
  chính gồm: Nhật ký của tôi, Bạn bè (bảng khoảnh khắc), Đăng nhanh, Quản lý bạn bè/tài khoản.
- **FR-035**: Dữ liệu (tài khoản, bạn bè, bài, quyền xem, ảnh) MUST được lưu bền vững, không mất khi khởi động lại.
- **FR-036**: Người vận hành app MUST có hướng dẫn sao lưu và khôi phục toàn bộ dữ liệu kèm ảnh.

### Key Entities

- **Người dùng (User)**: tên đăng nhập duy nhất (bí mật, chỉ để đăng nhập), mã định danh công khai duy nhất (cố
  định), tên hiển thị, mật khẩu (dạng băm), mã link kết bạn hiện hành, thời điểm tạo.
- **Lời mời kết bạn (Friend Request)**: từ một người dùng tới một người dùng khác; trạng thái đang chờ;
  biến mất khi được chấp nhận, từ chối hoặc hủy.
- **Quan hệ bạn bè (Friendship)**: quan hệ hai chiều giữa hai người dùng; thời điểm kết bạn; tối đa một
  quan hệ cho mỗi cặp.
- **Bài nhật ký (Entry)**: thuộc đúng một chủ bài; tiêu đề, nội dung, ngày giờ sự kiện, cách tạo (viết
  thường / đăng nhanh), thời điểm tạo/cập nhật. Có nhiều ảnh và nhiều người xem.
- **Ảnh (Photo)**: thuộc đúng một bài; định dạng, dung lượng, kích thước, thứ tự hiển thị.
- **Quyền xem (Entry Audience)**: "bài X được xem bởi bạn Y"; mỗi cặp tối đa một lần; chỉ tồn tại khi X
  và chủ bài đang là bạn. "Chỉ mình tôi" = không có quyền xem nào.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Từ màn hình chính trên điện thoại, người dùng đăng nhanh một khoảnh khắc (mở camera → chụp →
  đăng) trong vòng 10 giây, không tính thời gian tải lên trên mạng chậm.
- **SC-002**: Người dùng mới hoàn thành đăng ký và lưu bài nhật ký đầu tiên trong vòng 2 phút.
- **SC-003**: Hai người dùng hoàn tất kết bạn (gửi + chấp nhận) trong vòng 1 phút kể từ khi biết tên đăng
  nhập của nhau.
- **SC-004**: Bài chia sẻ xuất hiện trong bảng "Bạn bè" của người nhận ở lần mở/làm mới tiếp theo sau khi đăng.
- **SC-005**: Timeline hoặc bảng "Bạn bè" với 1.000 bài hiển thị phần đầu tiên trong vòng 2 giây trên kết
  nối thông thường.
- **SC-006**: 100% các lần truy cập bài hoặc ảnh bởi người không có quyền (khách, người không được chọn,
  người đã bị bỏ khỏi người xem, người đã hủy kết bạn) đều bị từ chối — kiểm chứng bằng kiểm thử tự động.
- **SC-007**: Sau khi khởi động lại hoặc khôi phục từ bản sao lưu, 100% bài và ảnh vẫn còn nguyên.
- **SC-008**: Người nhận link kết bạn (đã có tài khoản và đang đăng nhập) trở thành bạn trong một lần chạm, dưới
  5 giây.
- **SC-009**: 0 phản hồi API dành cho người dùng khác chứa tên đăng nhập của chủ tài khoản — kiểm chứng bằng
  kiểm thử tự động.

## Assumptions

- Phạm vi phiên bản này chỉ gồm chia sẻ và xem. Bình luận, thả cảm xúc, thông báo đẩy, widget màn hình
  chính, video và tìm kiếm để làm sau.
- Đăng ký mở cho bất kỳ ai truy cập được trang; nhóm người dùng nhỏ (dưới 100 người), không xác minh email;
  không có luồng quên mật khẩu — người vận hành đặt lại thủ công.
- Kết bạn qua mã định danh hoặc link kết bạn (rev 3); chưa có mã QR. Link kết bạn cố định cho tới khi chủ link
  tạo link mới; người dùng tự cân nhắc khi gửi link vào nhóm đông người.
- Không giới hạn số bạn bè trong phiên bản này (nhóm nhỏ).
- Bảng "Bạn bè" cập nhật khi người dùng mở hoặc làm mới trang; chưa cần cập nhật thời gian thực.
- Ngày giờ sự kiện lưu và hiển thị đúng như người viết chọn theo giờ địa phương (mặc định UTC+7).
- Không chỉnh sửa ảnh (cắt, lọc màu) trong app; hệ thống có thể tự tạo ảnh thu nhỏ và giảm kích thước
  ảnh hiển thị để tải nhanh, nhưng giữ bản gốc.
- Camera trong trình duyệt cần kết nối bảo mật (HTTPS) hoặc chạy trên máy cục bộ; bản triển khai trên
  Internet có HTTPS sẵn.
- App được triển khai lên các dịch vụ đám mây có gói miễn phí (lưu trữ ứng dụng, cơ sở dữ liệu, kho ảnh);
  phạm vi dùng nằm trong hạn mức miễn phí (nhóm nhỏ, vài GB ảnh). Khi không có ai dùng một thời gian, lần
  mở đầu tiên có thể chậm vài giây.
- Giao diện theo phong cách neo-brutalism nền sáng đã được duyệt trong bản thiết kế "MemorySave – UI"
  (https://claude.ai/artifact/R54gKMFCQv1fsT3R8xAz9o): nền kem có chấm, viền đen dày, bóng đổ cứng mỏng,
  màu pastel (tím lavender, cam đào, vàng, xanh bạc hà), tiêu đề dạng sticker; 8 màn: Đăng nhập, Camera
  (màn mặc định sau đăng nhập), Xem lại, Khoảnh khắc, Nhật ký, Viết, Chi tiết bài, Bạn bè.
