# Data Model: Trang giới thiệu công khai (004-landing-page)

**Không có thay đổi lược đồ, không migration, không đọc dữ liệu người dùng.**

Trang giới thiệu chỉ dùng nội dung tĩnh trong mã (`src/lib/landing-content.ts`): danh sách tính năng, các bước bắt đầu,
câu hỏi thường gặp, và dữ liệu mẫu hư cấu cho hình minh họa (FR-L03). Proxy chỉ xét có/không cookie `ms_session`
(như 003).
