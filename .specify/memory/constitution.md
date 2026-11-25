<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0 (MINOR: mở rộng Nguyên tắc II cho mô hình kết bạn / chia sẻ khoảnh khắc)
- Modified principles: II. Riêng tư mặc định — thay "riêng tư khi tạo" bằng "không hiển thị cho ai nếu
  chủ bài chưa chủ động chọn người xem; lần đầu mặc định chỉ mình tôi; chỉ chia sẻ cho bạn bè;
  hủy kết bạn thu hồi quyền xem"
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->
# MemorySave Constitution

## Core Principles

### I. Đơn giản trước tiên

MemorySave là ứng dụng cá nhân nhỏ. Mỗi thư viện, framework, dịch vụ hay bước build MUST được
biện minh bằng một yêu cầu cụ thể trong spec; nếu không, không thêm vào.
Ưu tiên một tiến trình backend duy nhất và một kho dữ liệu nhúng/đơn giản thay vì kiến trúc
phân tán (microservice, hàng đợi, cache riêng) trừ khi có nhu cầu đo được.
Mọi độ phức tạp vượt mức MUST được ghi trong mục Complexity Tracking của plan.
Lý do: app nhỏ phải dễ đọc, dễ sửa, dễ chạy lại sau nhiều tháng không đụng tới.

### II. Riêng tư mặc định (NON-NEGOTIABLE)

Không bài nhật ký hay media nào được hiển thị cho người khác nếu chủ sở hữu chưa chủ động chọn người
xem; lựa chọn người xem MUST hiển thị rõ trước khi đăng, và lần đầu MUST mặc định là "chỉ mình tôi".
Chỉ được chia sẻ cho người đang là bạn bè; chủ sở hữu có thể thu hồi bất kỳ lúc nào, và hủy kết bạn
MUST thu hồi mọi quyền xem giữa hai người.
Mọi thao tác đọc/sửa/xóa MUST được kiểm tra quyền ở phía server cho từng request; việc ẩn nút
trên giao diện không được coi là kiểm soát truy cập.
Người không có quyền MUST nhận phản hồi không tiết lộ sự tồn tại của nội dung (ví dụ 404).
Lý do: nhật ký là dữ liệu cá nhân nhạy cảm; một lần lộ là mất lòng tin vĩnh viễn.

### III. Logic nghiệp vụ có test

Các quy tắc nghiệp vụ cốt lõi — kiểm tra quyền truy cập, chia sẻ/thu hồi, sắp xếp và lọc
timeline theo ngày giờ, kiểm tra media — MUST có test tự động chạy được bằng một lệnh duy nhất.
Logic này SHOULD nằm trong module thuần, tách khỏi tầng HTTP và giao diện để dễ test.
Test cho hành vi phân quyền MUST bao gồm cả trường hợp bị từ chối, không chỉ trường hợp thành công.
Lý do: lỗi phân quyền hay sai thứ tự timeline khó phát hiện bằng mắt nhưng gây hậu quả lớn.

### IV. Media an toàn

Upload ảnh/video MUST được kiểm tra ở phía server: loại file theo danh sách cho phép (dựa trên
nội dung file, không chỉ phần mở rộng) và giới hạn dung lượng tối đa được nêu rõ trong spec.
File media MUST được lưu với tên do hệ thống sinh ra, không dùng tên người dùng gửi lên làm đường dẫn.
Media MUST chỉ được phục vụ qua endpoint có kiểm tra quyền giống như bài nhật ký chứa nó;
không đặt media trong thư mục public truy cập trực tiếp.
Lý do: upload là bề mặt tấn công lớn nhất của app và media chứa thông tin riêng tư.

### V. Dữ liệu người dùng bền vững

Nhật ký và media đã lưu thành công MUST không bị mất do khởi động lại hoặc cập nhật ứng dụng.
Thay đổi lược đồ dữ liệu MUST đi kèm migration không phá hủy dữ liệu hiện có.
Ứng dụng MUST có cách sao lưu và khôi phục toàn bộ dữ liệu (cơ sở dữ liệu + media) được tài liệu hóa.
Xóa bài SHOULD yêu cầu xác nhận trước khi thực hiện.
Lý do: nhật ký là ký ức không thể tạo lại.

## Ràng buộc kỹ thuật

- Ứng dụng web gồm backend (cần cho tài khoản, chia sẻ giữa người dùng và lưu media) và giao diện web.
- MUST chạy được local với số bước tối thiểu, được ghi trong quickstart (lý tưởng: cài phụ thuộc
  rồi một lệnh khởi động).
- Giao diện MUST responsive và dùng tốt trên điện thoại (màn hình từ 360px), bao gồm chọn ngày giờ
  và đính kèm ảnh/video từ thiết bị di động.
- Mật khẩu MUST được băm bằng thuật toán chuyên dụng (bcrypt/argon2 hoặc tương đương); bí mật
  cấu hình MUST không được commit vào mã nguồn.
- Tài liệu, spec và giao diện người dùng viết bằng tiếng Việt.

## Quy trình phát triển

- Mọi tính năng đi theo luồng Spec Kit: specify → (clarify) → plan → tasks → implement.
- Plan MUST có mục Constitution Check đối chiếu với năm nguyên tắc trên trước khi viết code.
- Không hoàn thành một tác vụ khi test của nó đang đỏ; test phân quyền và media MUST xanh trước khi merge.
- Thay đổi đụng tới phân quyền, upload hoặc lược đồ dữ liệu MUST được rà soát riêng theo
  Nguyên tắc II, IV, V.

## Governance

Constitution này có hiệu lực cao hơn mọi quy ước khác của dự án. Khi spec hoặc plan mâu thuẫn với
constitution, phải sửa spec/plan hoặc sửa đổi constitution trước — không bỏ qua ngầm.

Sửa đổi constitution: ghi rõ lý do, cập nhật Sync Impact Report và tăng phiên bản theo semver —
MAJOR khi bỏ hoặc định nghĩa lại nguyên tắc, MINOR khi thêm nguyên tắc/mục hoặc mở rộng đáng kể,
PATCH khi chỉ làm rõ câu chữ.

Mỗi plan và mỗi lần review MUST xác minh tuân thủ; mọi ngoại lệ MUST được biện minh trong
Complexity Tracking.

**Version**: 1.1.0 | **Ratified**: 2026-11-25 | **Last Amended**: 2026-11-25
