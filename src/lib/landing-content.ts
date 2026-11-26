// Pure — text of the public landing page and its structured data (004 research R3, R4). Keep claims true to the app.
import { MAX_PHOTOS_PER_ENTRY } from "./messages";
import { SITE_NAME } from "./share-text";

export const LANDING_TITLE = `${SITE_NAME} — Nhật ký riêng tư, chia sẻ khoảnh khắc với người thân`;
/** Shown under the h1 — written to be felt, not to sell. (The meta description below stays factual for search.) */
export const LANDING_INTRO =
  "Có những ngày rất bình thường mà mãi về sau ta lại nhớ nhung. Viết vài dòng, chụp một tấm ảnh, cất giữ cho riêng mình — hay cho vài người thân thương nhất.";

/** Meta description / JSON-LD: what the app does, for search results. */
export const LANDING_DESCRIPTION =
  "Viết nhật ký mỗi ngày, chụp và lưu khoảnh khắc trong vài giây, rồi tự chọn người thân nào được xem. Miễn phí, riêng tư mặc định.";

export type FeatureIcon = "book" | "camera" | "users" | "lock";
export type Tone = "sky" | "peach" | "mint" | "lavender" | "butter" | "pink";

export const FEATURES: { icon: FeatureIcon; tone: Tone; title: string; body: string }[] = [
  {
    icon: "book",
    tone: "sky",
    title: "Nhật ký theo từng ngày",
    body: `Viết vài dòng, đính kèm tới ${MAX_PHOTOS_PER_ENTRY} ảnh, chọn đúng ngày giờ đã xảy ra. Xem lại theo dòng thời gian, nhảy tới bất kỳ ngày nào.`,
  },
  {
    icon: "camera",
    tone: "peach",
    title: "Chụp là đăng, trong vài giây",
    body: "Mở camera ngay trong app, thêm một dòng chú thích rồi đăng — khoảnh khắc được lưu đúng lúc nó xảy ra.",
  },
  {
    icon: "users",
    tone: "mint",
    title: "Bạn chọn ai được xem",
    body: "Mỗi bài có thể chỉ cho riêng mình, cho tất cả bạn bè, hoặc chỉ vài người thân cụ thể.",
  },
  {
    icon: "lock",
    tone: "lavender",
    title: "Riêng tư mặc định",
    body: "Bài đầu tiên luôn là “Chỉ mình tôi”. Người lạ không thấy gì; hủy kết bạn là thu hồi quyền xem ngay.",
  },
];

export const STEPS: { title: string; body: string }[] = [
  { title: "Tạo tài khoản", body: "Bằng Google, hoặc tên đăng nhập kèm email — chưa tới hai phút." },
  { title: "Gửi link kết bạn", body: "Mỗi người có một link riêng; người thân bấm vào là thành bạn." },
  { title: "Lưu và chia sẻ", body: "Viết, chụp, rồi chọn ai được xem từng khoảnh khắc." },
];

export const FAQ: { question: string; answer: string }[] = [
  { question: "MemorySave có miễn phí không?", answer: "Có. Bạn dùng mọi tính năng mà không mất phí." },
  {
    question: "Ai xem được nhật ký của tôi?",
    answer:
      "Chỉ những người bạn chọn cho từng bài, và họ phải đang là bạn bè của bạn. Bài mới mặc định chỉ mình bạn xem.",
  },
  {
    question: "Bạn bè có sửa hay chia sẻ tiếp bài của tôi được không?",
    answer: "Không. Người được chia sẻ chỉ xem được; chỉ bạn sửa, xóa hoặc đổi người xem.",
  },
  {
    question: "Có cần cài ứng dụng không?",
    answer:
      "Không. MemorySave chạy trên trình duyệt của điện thoại và máy tính; chọn “Thêm vào màn hình chính” để mở như một ứng dụng.",
  },
  {
    question: "Quên mật khẩu thì sao?",
    answer: "Bấm “Quên mật khẩu?” ở trang đăng nhập, nhận mã qua email đã xác thực rồi đặt mật khẩu mới.",
  },
  {
    question: "Kết bạn với người thân thế nào?",
    answer: "Gửi link kết bạn ở tab Cá nhân, hoặc nhập mã định danh của nhau.",
  },
];

/** schema.org WebApplication for the landing page (rendered as JSON-LD). */
export function jsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: new URL("/", siteUrl).toString(),
    description: LANDING_DESCRIPTION,
    inLanguage: "vi",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
  };
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so it can never close the tag (Next json-ld guide). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
