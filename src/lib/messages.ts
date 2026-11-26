// Error codes and Vietnamese messages — contracts/api.md › error table. Shared by server and client.

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "BAD_ORIGIN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "RULE"
  | "RATE_LIMITED"
  | "GONE"
  | "CODE_INVALID"
  | "MAIL_UNAVAILABLE"
  | "MAIL_FAILED"
  | "INTERNAL";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS_PER_ENTRY = 10;
export const MAX_UNATTACHED_PHOTOS = 30;
export const MAX_TITLE = 200;
export const MAX_BODY = 20_000;
export const MAX_CAPTION = 200;
export const MAX_DISPLAY_NAME = 50;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;
export const MAX_EMAIL = 254;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export const msg = {
  // generic
  validation: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  unauthenticated: "Bạn cần đăng nhập để tiếp tục.",
  badOrigin: "Yêu cầu không hợp lệ.",
  notFound: "Không tìm thấy.",
  internal: "Có lỗi xảy ra. Vui lòng thử lại.",
  network: "Mất kết nối. Vui lòng thử lại.",

  // auth
  usernameFormat: "Tên đăng nhập gồm 3–30 ký tự: chữ thường không dấu, số hoặc dấu gạch dưới.",
  usernameTaken: "Tên đăng nhập này đã có người dùng.",
  passwordTooShort: `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`,
  passwordMismatch: "Mật khẩu nhập lại không khớp.",
  usernameRequired: "Tên đăng nhập không được để trống.",
  passwordRequired: "Mật khẩu không được để trống.",
  passwordTooLong: "Mật khẩu quá dài.",
  displayNameRequired: "Hãy nhập tên hiển thị — đây là tên bạn bè sẽ thấy.",
  displayNameTooLong: `Tên hiển thị tối đa ${MAX_DISPLAY_NAME} ký tự.`,
  invalidCredentials: "Tên đăng nhập hoặc mật khẩu không đúng.",
  rateLimited: "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.",

  // Google login (002)
  googleContinue: "Tiếp tục với Google",
  googleCancelled: "Bạn đã hủy đăng nhập bằng Google.",
  googleFailed: "Không đăng nhập được bằng Google. Vui lòng thử lại.",
  googleUnverified: "Email Google này chưa được xác minh nên không dùng để đăng nhập được.",
  googleExpired: "Phiên đăng ký bằng Google đã hết hạn. Vui lòng thử lại.",
  googleConflict: "Email này đã gắn với một tài khoản Google khác. Hãy đăng nhập bằng tên đăng nhập và mật khẩu.",
  googleEmailTaken: "Email Google này vừa được dùng cho một tài khoản khác. Hãy bấm “Tiếp tục với Google” lần nữa.",

  // e-mail codes (005)
  emailRequired: "Email không được để trống.",
  emailInvalid: "Email chưa đúng định dạng.",
  emailSameAsCurrent: "Đây là email hiện tại của bạn.",
  emailUnavailable: "Email này không dùng được. Hãy chọn email khác.",
  emailTakenOnSignup: "Tên đăng nhập hoặc email vừa được người khác dùng. Vui lòng thử lại.",
  codeFormat: "Mã gồm 6 chữ số.",
  codeInvalid: (left: number) => `Mã không đúng. Bạn còn ${left} lần thử.`,
  codeExpired: "Mã đã hết hiệu lực. Hãy gửi mã mới.",
  codeWait: (seconds: number) => `Vui lòng đợi ${seconds} giây rồi gửi lại.`,
  tooManyCodes: "Bạn đã yêu cầu quá nhiều mã. Hãy thử lại sau ít phút.",
  mailUnavailable: "Tính năng gửi mã tạm thời chưa dùng được. Vui lòng thử lại sau.",
  mailFailed: "Chưa gửi được mã. Vui lòng thử lại.",
  emailCardWarning: "Bạn chưa có email. Thêm email để đăng nhập bằng Google và lấy lại mật khẩu khi quên.",

  // entries
  titleTooLong: `Tiêu đề tối đa ${MAX_TITLE} ký tự.`,
  bodyTooLong: `Nội dung tối đa ${MAX_BODY.toLocaleString("vi-VN")} ký tự.`,
  captionTooLong: `Chú thích tối đa ${MAX_CAPTION} ký tự.`,
  entryEmpty: "Hãy nhập tiêu đề, nội dung hoặc thêm ít nhất một ảnh.",
  eventInFuture: "Ngày giờ không được ở tương lai.",
  eventAtFormat: "Ngày giờ không hợp lệ.",
  quickNeedsOnePhoto: "Đăng nhanh cần đúng một ảnh.",
  tooManyPhotos: `Mỗi bài tối đa ${MAX_PHOTOS_PER_ENTRY} ảnh.`,
  photoNotAttachable: "Có ảnh không hợp lệ hoặc chưa tải xong.",

  // photos
  photoTooLarge: "Ảnh vượt quá 10 MB.",
  photoUnsupported: "Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc HEIC.",
  photoNotUploaded: "Ảnh chưa được tải lên xong.",
  tooManyUnattached: "Bạn có quá nhiều ảnh chưa đăng. Hãy đăng hoặc xóa bớt rồi thử lại.",

  // friends & audience
  userNotFound: "Không có ai với mã định danh này.",
  inviteInvalid: "Link kết bạn không còn hiệu lực. Hãy xin người gửi link mới.",
  inviteSelf: "Đây là link kết bạn của chính bạn.",
  cannotFriendSelf: "Bạn không thể kết bạn với chính mình.",
  audienceNotFriend: "Chỉ có thể chia sẻ cho người đang là bạn bè.",
} as const;

/** `/login?error=<code>` values set by the Google flow (002 research R9); anything else is ignored. */
export const GOOGLE_LOGIN_ERRORS = {
  google_cancelled: msg.googleCancelled,
  google_failed: msg.googleFailed,
  google_unverified: msg.googleUnverified,
  google_expired: msg.googleExpired,
  google_conflict: msg.googleConflict,
} as const;
export type GoogleLoginError = keyof typeof GOOGLE_LOGIN_ERRORS;

export function googleLoginErrorMessage(code: string | undefined): string | null {
  return code && Object.hasOwn(GOOGLE_LOGIN_ERRORS, code) ? GOOGLE_LOGIN_ERRORS[code as GoogleLoginError] : null;
}
