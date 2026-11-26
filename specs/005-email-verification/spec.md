# Feature Specification: Email xác thực bằng mã OTP, đăng nhập Google theo email, quên mật khẩu

**Feature Branch**: `005-email-verification`

**Created**: 2026-11-26

**Status**: Implemented (commit `ccba5e7`, 2026-11-26) — bổ sung sau triển khai ở cuối mục Requirements

**Input**: User description: "Tạo tài khoản vẫn có tên đăng nhập, nhưng thêm ô email và xác thực email đó bằng mã OTP
gửi về hộp thư. Đăng nhập bằng tên đăng nhập hoặc bằng Google đều được: Google trả về email, khớp với email trong hệ
thống thì vẫn cho vào bình thường." Quyết định (2026-11-26): gửi mail qua Gmail SMTP; tài khoản cũ chưa có email
**không bắt buộc** thêm — chỉ cảnh báo ở trang Cá nhân; làm luôn "Quên mật khẩu" qua OTP.

Tính năng này **thay thế** quyết định "không liên kết tài khoản" (002 rev 2) và "trang Cá nhân không hiển thị email"
(002 rev 3): tài khoản có email đã xác thực được tự động gắn với Google cùng email; chủ tài khoản thấy email của mình ở
trang Cá nhân.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đăng ký có email đã xác thực (Priority: P1)

Người mới mở form đăng ký, nhập tên đăng nhập, mật khẩu, tên hiển thị và email, bấm "Gửi mã". Họ mở hộp thư, thấy
thư từ MemorySave có mã 6 số, nhập mã vào app — tài khoản được tạo và họ vào màn Chụp.

**Why this priority**: Mọi thứ khác (đăng nhập Google theo email, quên mật khẩu) dựa trên việc tài khoản có email
đã xác thực.

**Independent Test**: Đăng ký với một email thật → nhận thư có mã → nhập đúng mã → tài khoản được tạo, trang Cá nhân
hiển thị email đó. Thử nhập sai mã, mã hết hạn, gửi lại quá nhanh → đều bị từ chối với thông báo tiếng Việt.

**Acceptance Scenarios**:

1. **Given** form đăng ký hợp lệ (tên đăng nhập chưa ai dùng, mật khẩu đủ mạnh, tên hiển thị, email đúng định dạng),
   **When** bấm "Gửi mã", **Then** một mã 6 số được gửi tới email đó, form chuyển sang bước nhập mã, chưa có tài khoản nào
   được tạo.
2. **Given** bước nhập mã, **When** nhập đúng mã trong vòng 10 phút, **Then** tài khoản được tạo với email đã xác thực,
   người dùng được đăng nhập và vào màn Chụp (hoặc đúng trang `next`, ví dụ link mời kết bạn).
3. **Given** bước nhập mã, **When** nhập sai, **Then** báo "Mã không đúng" kèm số lần còn lại; sai đủ 5 lần thì mã bị huỷ
   và phải gửi mã mới.
4. **Given** mã đã quá 10 phút, **When** nhập mã, **Then** báo mã đã hết hạn và cho gửi lại.
5. **Given** vừa gửi mã, **When** bấm "Gửi lại" trước 60 giây, **Then** nút bị khoá và hiện thời gian đếm ngược.
6. **Given** tên đăng nhập đã có người dùng hoặc dữ liệu form sai, **When** bấm "Gửi mã", **Then** báo lỗi ngay, không
   gửi thư.
7. **Given** email đã thuộc một tài khoản khác, **When** bấm "Gửi mã", **Then** giao diện vẫn báo "Đã gửi mã" như bình
   thường (không tiết lộ email đã có tài khoản); thư gửi tới email đó không chứa mã mà báo "Email này đã có tài khoản
   MemorySave — hãy đăng nhập hoặc dùng Quên mật khẩu"; mọi mã nhập vào đều bị từ chối.
8. **Given** hai người cùng đăng ký một tên đăng nhập hoặc một email gần như cùng lúc, **When** cả hai nhập đúng mã,
   **Then** chỉ một tài khoản được tạo; người còn lại nhận lỗi rõ ràng.

---

### User Story 2 - Đăng nhập Google vào tài khoản có cùng email (Priority: P1)

Người đã có tài khoản tên đăng nhập + email đã xác thực `an@gmail.com`. Một hôm họ bấm "Tiếp tục với Google", chọn
Google `an@gmail.com` — họ vào thẳng tài khoản cũ của mình, đầy đủ nhật ký và bạn bè. Từ đó cả hai cách đăng nhập
đều dùng được.

**Why this priority**: Đây là yêu cầu chính của người dùng — không phải nhớ mật khẩu nhưng không mất tài khoản cũ.

**Independent Test**: Tạo tài khoản bằng tên đăng nhập với email X đã xác thực → đăng xuất → đăng nhập Google bằng X →
vào đúng tài khoản cũ (cùng mã định danh, cùng nhật ký), không qua bước tên hiển thị; đăng xuất, đăng nhập lại bằng tên
đăng nhập + mật khẩu → vẫn được.

**Acceptance Scenarios**:

1. **Given** tài khoản đã gắn Google này, **When** đăng nhập Google, **Then** vào tài khoản đó (như 002).
2. **Given** chưa tài khoản nào gắn Google này nhưng có tài khoản với email đã xác thực trùng email Google (không phân
   biệt hoa thường) và Google xác nhận email đã xác thực, **When** đăng nhập Google, **Then** Google được gắn vào tài
   khoản đó và người dùng vào tài khoản đó; lần sau nhận ra ngay bằng Google.
3. **Given** không khớp tài khoản nào, **When** đăng nhập Google, **Then** đi luồng tạo tài khoản mới như 002 (xác nhận
   tên hiển thị); tài khoản mới có email Google, coi là đã xác thực.
4. **Given** Google báo email chưa xác thực, **When** đăng nhập Google, **Then** từ chối như 002, không khớp, không tạo.
5. **Given** tài khoản có email trùng nhưng đã gắn một tài khoản Google **khác**, **When** đăng nhập bằng Google mới,
   **Then** không gắn thêm, không vào; báo lỗi tiếng Việt dễ hiểu.
6. **Given** tài khoản đã gắn Google, **When** đăng nhập bằng tên đăng nhập + mật khẩu, **Then** vẫn vào được.
7. **Given** luồng link mời (`/add/...`), **When** vào bằng Google theo kịch bản 2, **Then** quay lại đúng link mời như 002.

---

### User Story 3 - Quên mật khẩu (Priority: P2)

Người quên mật khẩu bấm "Quên mật khẩu?" ở trang đăng nhập, nhập email, nhận mã 6 số, nhập mã và mật khẩu mới — mật
khẩu được đổi, mọi thiết bị khác bị đăng xuất, và họ vào app.

**Why this priority**: Có email đã xác thực rồi thì đây là lợi ích lớn tiếp theo; trước đây quên mật khẩu là mất tài
khoản.

**Independent Test**: Tài khoản có email X đang đăng nhập ở trình duyệt A → ở trình duyệt B chạy Quên mật khẩu với X →
đặt mật khẩu mới → B vào app; A bị đăng xuất ở lần tải trang kế tiếp; mật khẩu cũ không còn dùng được.

**Acceptance Scenarios**:

1. **Given** trang đăng nhập, **Then** có liên kết "Quên mật khẩu?" tới trang lấy lại mật khẩu.
2. **Given** email thuộc tài khoản có tên đăng nhập và email đã xác thực, **When** gửi yêu cầu, **Then** mã 6 số được gửi
   tới email đó.
3. **Given** email không thuộc tài khoản nào, hoặc thuộc tài khoản chỉ đăng nhập bằng Google, **When** gửi yêu cầu, **Then**
   giao diện báo giống hệt kịch bản 2 ("Nếu email này có tài khoản, mã đã được gửi"); với tài khoản chỉ dùng Google, thư
   nhắc "Tài khoản này đăng nhập bằng Google" thay vì gửi mã; với email không có tài khoản thì không gửi thư.
4. **Given** mã đúng, chưa hết hạn, mật khẩu mới hợp lệ, **When** xác nhận, **Then** mật khẩu được đổi, mọi phiên đăng
   nhập cũ của tài khoản bị huỷ, người dùng được đăng nhập bằng một phiên mới và vào màn Chụp.
5. **Given** mã sai/hết hạn/quá 5 lần, **Then** xử lý như User Story 1; mật khẩu không đổi.
6. **Given** một mã đã dùng để đổi mật khẩu, **When** dùng lại, **Then** bị từ chối.

---

### User Story 4 - Tài khoản cũ thêm email ở trang Cá nhân (Priority: P2)

Người dùng cũ (tài khoản tên đăng nhập, chưa có email) mở trang Cá nhân và thấy một cảnh báo "Bạn chưa có email —
thêm email để đăng nhập bằng Google và lấy lại mật khẩu khi quên". Họ nhập email, nhận mã, nhập mã — cảnh báo biến
mất, trang hiện email của họ. Người không muốn thêm thì vẫn dùng app bình thường.

**Why this priority**: Đưa tài khoản cũ vào luồng mới mà không ép buộc.

**Independent Test**: Đăng nhập tài khoản cũ → mọi trang khác không đổi; trang Cá nhân có cảnh báo → thêm email, xác
thực → cảnh báo biến mất; đăng nhập Google bằng email đó → vào đúng tài khoản.

**Acceptance Scenarios**:

1. **Given** tài khoản chưa có email, **When** mở trang Cá nhân, **Then** thấy cảnh báo kèm chỗ thêm email; các trang khác
   không có cảnh báo hay chặn nào.
2. **Given** chủ tài khoản nhập email và mã đúng, **Then** email được lưu là đã xác thực; cảnh báo biến mất.
3. **Given** email đó đã thuộc tài khoản khác, **When** bấm "Gửi mã", **Then** xử lý như User Story 1 kịch bản 7 (không
   tiết lộ; không thể xác thực).
4. **Given** tài khoản đã có email, **When** mở trang Cá nhân, **Then** thấy email của mình (chỉ chủ tài khoản thấy) và có
   thể đổi sang email khác bằng cách xác thực email mới; email cũ giữ nguyên cho tới khi email mới được xác thực.
5. **Given** người khác (bạn bè hay người lạ), **Then** không bao giờ thấy email của tài khoản này ở bất kỳ đâu.

---

### Edge Cases

- Email nhập có chữ hoa hoặc khoảng trắng thừa: chuẩn hoá (bỏ khoảng trắng, chữ thường) trước khi so sánh và lưu.
- Gửi mã quá nhiều: mỗi email tối đa 5 lần gửi / giờ, mỗi địa chỉ IP tối đa 20 lần gửi / giờ; vượt thì báo "Bạn đã yêu
  cầu quá nhiều mã, hãy thử lại sau" và không gửi.
- Gửi thư thất bại (dịch vụ mail lỗi): báo "Chưa gửi được mã, hãy thử lại" và không tính vào thời gian chờ 60 giây.
- Gửi mã mới làm mã cũ của cùng mục đích + email hết hiệu lực.
- Mã của mục đích này không dùng được cho mục đích khác (đăng ký ≠ thêm email ≠ quên mật khẩu).
- Người dùng đóng trình duyệt giữa chừng khi đăng ký: chưa có tài khoản nào; mở lại phải điền lại form và gửi mã mới.
- Tài khoản Google cũ (tạo ở 002) đã có email Google: coi là email đã xác thực; không hiện cảnh báo.
- Hai tài khoản cũ không thể có cùng email (mỗi email chỉ thuộc một tài khoản), nên kịch bản khớp Google không bao giờ
  có hai ứng viên.
- Tài khoản bị đổi mật khẩu qua Quên mật khẩu nhưng đã gắn Google: Google vẫn dùng được.
- Chạy local / test: không gửi thư thật; mã được ghi ra log máy chủ để nhà phát triển nhập.
- Chưa cấu hình gửi mail trên môi trường thật: đăng ký bằng tên đăng nhập, thêm email và quên mật khẩu báo "Tính năng
  tạm thời chưa dùng được"; đăng nhập (mật khẩu, Google) vẫn hoạt động.

## Requirements *(mandatory)*

### Functional Requirements

**Email & mã xác thực**

- **FR-E01**: Mỗi tài khoản MUST có tối đa một email; email MUST chỉ được lưu vào tài khoản sau khi đã xác thực (bằng mã
  hoặc do Google xác nhận). Email MUST duy nhất trên toàn hệ thống sau khi chuẩn hoá (cắt khoảng trắng, chữ thường), tối
  đa 254 ký tự, đúng định dạng email.
- **FR-E02**: Mã xác thực MUST là 6 chữ số ngẫu nhiên, hết hạn sau 10 phút, chỉ dùng một lần, gắn với một mục đích (đăng
  ký / thêm-đổi email / quên mật khẩu) và một email; hệ thống MUST không lưu mã ở dạng đọc được.
- **FR-E03**: Sai mã 5 lần MUST huỷ mã đó. Gửi lại MUST cách lần gửi trước ít nhất 60 giây. Giới hạn gửi: 5 lần / email /
  giờ và 20 lần / IP / giờ.
- **FR-E04**: Thư MUST viết bằng tiếng Việt, nêu mã, thời hạn 10 phút, mục đích, và dặn không chia sẻ mã; thư MUST không
  chứa liên kết đăng nhập.
- **FR-E05**: Các thông báo của bước gửi mã MUST không tiết lộ một email đã có tài khoản hay chưa (giao diện giống nhau;
  khác biệt chỉ nằm trong nội dung thư gửi tới chính hộp thư đó).
- **FR-E06**: Môi trường local/test MUST không gửi thư thật mà ghi mã ra log máy chủ.

**Đăng ký**

- **FR-E07**: Đăng ký bằng tên đăng nhập MUST yêu cầu email; tài khoản MUST chỉ được tạo sau khi nhập đúng mã. Các quy tắc
  hiện có về tên đăng nhập, mật khẩu, tên hiển thị, mã định danh và link kết bạn giữ nguyên.
- **FR-E08**: Tên đăng nhập và dữ liệu form MUST được kiểm tra trước khi gửi mã; tính duy nhất của tên đăng nhập và email
  MUST được kiểm tra lại khi tạo tài khoản.

**Đăng nhập Google**

- **FR-E09**: Đăng nhập Google MUST xét theo thứ tự: (1) tài khoản đã gắn Google này → vào; (2) tài khoản có email đã xác
  thực trùng email Google (Google xác nhận đã xác thực) và chưa gắn Google nào → gắn rồi vào; (3) tài khoản trùng email
  nhưng đã gắn Google khác → từ chối; (4) không khớp → tạo tài khoản mới như 002, lưu email Google là đã xác thực.
- **FR-E10**: Một tài khoản MUST có thể có cả tên đăng nhập + mật khẩu và Google; cả hai cách đều đăng nhập được.

**Quên mật khẩu**

- **FR-E11**: Trang đăng nhập MUST có liên kết tới trang lấy lại mật khẩu (`/forgot-password`).
- **FR-E12**: Lấy lại mật khẩu MUST chỉ áp dụng cho tài khoản có tên đăng nhập + email đã xác thực; đổi mật khẩu thành
  công MUST huỷ mọi phiên đăng nhập hiện có của tài khoản và tạo một phiên mới cho người vừa đổi.

**Trang Cá nhân**

- **FR-E13**: Trang Cá nhân MUST hiển thị cảnh báo kèm chỗ thêm email cho tài khoản chưa có email; MUST không chặn hay
  cảnh báo ở trang khác.
- **FR-E14**: Trang Cá nhân MUST cho chủ tài khoản xem email của mình và đổi email (xác thực email mới; email cũ giữ tới khi
  xác thực xong).
- **FR-E15**: Email MUST chỉ trả về cho chính chủ tài khoản; MUST không xuất hiện trong dữ liệu bạn bè, người xem bài, trang
  mời kết bạn, ảnh xem trước chia sẻ hay bất kỳ phản hồi nào cho người khác.

**Chung**

- **FR-E16**: Nếu chưa cấu hình gửi mail ở môi trường thật, các luồng cần gửi mã MUST báo không khả dụng; đăng nhập MUST vẫn
  hoạt động.
- **FR-E17**: Dữ liệu hiện có MUST giữ nguyên qua thay đổi (Nguyên tắc V): tài khoản Google cũ chuyển email sang dạng đã xác
  thực; tài khoản tên đăng nhập cũ không có email.
- **FR-E18**: Route tiếng Anh; chữ giao diện và thư tiếng Việt; phong cách giao diện hiện có, dùng tốt từ 360px.

**Bổ sung sau triển khai (yêu cầu 2026-11-26/27)**

- **FR-E19**: Các form (đăng nhập/đăng ký, mã xác thực, quên mật khẩu, email ở /me) MUST kiểm tra dữ liệu ngay trên trình
  duyệt bằng cùng luật và cùng câu thông báo với máy chủ (`src/lib/validation.ts`); dữ liệu sai thì không gửi yêu cầu.
  Máy chủ vẫn kiểm tra lại mọi thứ.
- **FR-E20**: Ô trống MUST báo "… không được để trống" (vd "Email không được để trống."), không báo "sai định dạng".
- **FR-E21**: Đăng ký và đặt mật khẩu mới MUST có ô "Nhập lại mật khẩu" (không khớp → "Mật khẩu nhập lại không khớp.");
  mọi ô mật khẩu MUST có nút ẩn/hiện.

### Key Entities

- **Tài khoản (mở rộng)**: thêm email đã xác thực (tuỳ chọn, duy nhất) và thời điểm xác thực; có thể đồng thời có tên đăng
  nhập + mật khẩu và Google.
- **Mã xác thực email**: email, mục đích, mã (không lưu dạng đọc được), dữ liệu chờ đi kèm (với đăng ký: thông tin form
  đã kiểm tra; với thêm email: tài khoản yêu cầu), số lần nhập sai, thời điểm gửi, hết hạn, đã dùng chưa.
- **Lượt gửi mã**: dùng để đếm giới hạn gửi theo email và theo IP trong một giờ.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người mới hoàn tất đăng ký có xác thực email trong dưới 2 phút (tính cả mở hộp thư).
- **SC-002**: 100% lượt đăng nhập Google bằng email trùng email đã xác thực vào đúng tài khoản cũ; 0 tài khoản trùng lặp
  được tạo cho cùng một email.
- **SC-003**: Không có cách nào gắn Google vào tài khoản qua một email chưa được xác thực (có test cho các trường hợp bị từ
  chối).
- **SC-004**: Người quên mật khẩu lấy lại được tài khoản trong dưới 3 phút; mọi thiết bị khác bị đăng xuất.
- **SC-005**: Người dùng cũ không bị chặn hay thấy thay đổi nào ngoài cảnh báo ở trang Cá nhân.
- **SC-006**: Toàn bộ test hiện có vẫn xanh.

## Assumptions

- Gửi thư qua một hộp Gmail của chủ app bằng mật khẩu ứng dụng (App Password); giới hạn của Gmail (khoảng 500 thư/ngày)
  thừa cho quy mô app gia đình. Thư có thể vào mục Spam/Quảng cáo ở lần đầu — giao diện nhắc "kiểm tra cả thư mục Spam".
- Đăng nhập vẫn bằng tên đăng nhập (không đăng nhập bằng email + mật khẩu) — ngoài phạm vi.
- Tài khoản chỉ dùng Google (tạo ở 002) chưa thể tạo thêm tên đăng nhập + mật khẩu — ngoài phạm vi.
- Không có chức năng xoá email hay gỡ liên kết Google — ngoài phạm vi.
- Đổi email không gửi thư thông báo tới email cũ — chấp nhận ở quy mô hiện tại.
- Giới hạn gửi theo IP dựa trên địa chỉ IP mà nền tảng hosting cung cấp.
