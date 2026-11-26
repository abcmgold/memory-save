// Pure — the mails MemorySave sends (005 FR-E04, contracts/api.md › Thư). Vietnamese, no links, code in the subject
// so it shows on the phone's notification. The HTML follows the app's neo-brutalist look with e-mail-safe markup:
// tables, inline styles, no images/SVG/web fonts required, a thick right/bottom border instead of box-shadow (which
// Gmail drops). Colors are written so no 6-digit number appears in mails that must not contain a code.
import type { CodePurpose } from "../db/schema";

export type MailContent = { subject: string; text: string; html: string };

const C = {
  cream: "#fbf6ec",
  ink: "#111",
  body: "#3d3a34",
  muted: "#5a554c",
  white: "#fff",
  lavender: "#c8b6ff",
  peach: "#ffb38a",
  butter: "#ffe27a",
  mint: "#b8f2c8",
  sky: "#a8d8ff",
  pink: "#ffb3d1",
};
const FONT = "'Be Vietnam Pro', 'Segoe UI', Arial, Helvetica, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

const FOOTER = "Nếu không phải bạn yêu cầu, hãy bỏ qua thư này — tài khoản của bạn vẫn an toàn.";
const SIGNATURE = "Thư tự động từ MemorySave · vui lòng không trả lời thư này.";

type Tone = keyof typeof C;

/** Hard-shadow box: ink border, thicker on the right and bottom. */
function box(bg: string, radius: number, shadow = 5): string {
  return [
    `background:${bg}`,
    `border:2px solid ${C.ink}`,
    `border-right-width:${shadow}px`,
    `border-bottom-width:${shadow}px`,
    `border-radius:${radius}px`,
  ].join(";");
}

function chip(label: string, tone: Tone): string {
  return `<span style="display:inline-block;${box(C[tone], 10, 3)};padding:4px 10px;font-size:12px;font-weight:800;letter-spacing:0.3px;color:${C.ink}">${label}</span>`;
}

function paragraph(text: string, style = ""): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.body};${style}">${text}</p>`;
}

function codeBlock(code: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 10px">
  <tr><td align="center" style="${box(C.butter, 14)};padding:16px 8px">
    <div style="font-family:${MONO};font-size:36px;line-height:1.1;font-weight:800;letter-spacing:10px;color:${C.ink};padding-left:10px">${code}</div>
  </td></tr>
</table>
<p style="margin:0 0 18px;text-align:center;font-size:13px;font-weight:700;color:${C.muted}">Hiệu lực 10 phút · chỉ dùng được một lần</p>`;
}

function note(html: string, tone: Tone = "cream"): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 6px">
  <tr><td style="background:${C[tone]};border:2px dashed ${C.ink};border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.55;color:${C.ink}">${html}</td></tr>
</table>`;
}

function steps(items: string[]): string {
  const rows = items
    .map(
      (item, i) => `
  <tr>
    <td valign="top" width="34" style="padding:0 10px 10px 0">
      <div style="${box(C.butter, 999, 3)};width:26px;height:26px;line-height:26px;text-align:center;font-size:13px;font-weight:800;color:${C.ink}">${i + 1}</div>
    </td>
    <td valign="top" style="padding:3px 0 10px;font-size:15px;line-height:1.5;color:${C.body}">${item}</td>
  </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 8px">${rows}</table>`;
}

/** The shared frame: hidden preview line, logo, white card, footer. */
function layout(opts: { preheader: string; tag: string; tone: Tone; title: string; content: string }): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${FONT};color:${C.ink};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream}">
  <tr><td align="center" style="padding:28px 16px 36px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
      <tr><td style="padding:0 0 18px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle" style="${box(C.peach, 12, 4)};width:38px;height:38px;text-align:center;font-size:20px;font-weight:900;color:${C.ink};font-family:${FONT}">M</td>
          <td valign="middle" style="padding-left:10px">
            <span style="display:inline-block;${box(C.lavender, 4, 4)};padding:3px 10px;font-size:19px;font-weight:900;letter-spacing:-0.3px;color:${C.ink}">MemorySave</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="${box(C.white, 20, 6)};padding:24px 22px 22px">
        <div style="margin:0 0 14px">${chip(opts.tag, opts.tone)}</div>
        <h1 style="margin:0 0 12px;font-size:23px;line-height:1.25;font-weight:900;letter-spacing:-0.3px;color:${C.ink}">${opts.title}</h1>
        ${opts.content}
      </td></tr>
      <tr><td style="padding:18px 6px 0;font-size:12.5px;line-height:1.6;color:${C.muted}">
        <p style="margin:0 0 6px">${FOOTER}</p>
        <p style="margin:0;font-weight:700">${SIGNATURE}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const CODE_COPY: Record<CodePurpose, { tag: string; tone: Tone; title: string; intro: string; purpose: string }> = {
  signup: {
    tag: "Tạo tài khoản",
    tone: "mint",
    title: "Chào mừng bạn đến MemorySave",
    intro: "Nhập mã dưới đây vào màn hình đăng ký để xác thực email và hoàn tất tạo tài khoản.",
    purpose: "tạo tài khoản MemorySave",
  },
  change_email: {
    tag: "Xác thực email",
    tone: "sky",
    title: "Xác thực email của bạn",
    intro: "Nhập mã dưới đây ở trang Cá nhân để gắn email này vào tài khoản MemorySave của bạn.",
    purpose: "xác thực email cho tài khoản MemorySave",
  },
  reset_password: {
    tag: "Đặt lại mật khẩu",
    tone: "pink",
    title: "Đặt lại mật khẩu",
    intro: "Nhập mã dưới đây cùng mật khẩu mới. Sau khi đổi, mọi thiết bị khác sẽ được đăng xuất.",
    purpose: "đặt lại mật khẩu MemorySave",
  },
};

const NEVER_SHARE = "Đừng chia sẻ mã này với bất kỳ ai, kể cả người nói là từ MemorySave.";

export function codeMail(purpose: CodePurpose, code: string): MailContent {
  const copy = CODE_COPY[purpose];
  const text = [
    `Mã để ${copy.purpose} của bạn là: ${code}`,
    `Mã có hiệu lực trong 10 phút và chỉ dùng được một lần. ${NEVER_SHARE}`,
    FOOTER,
    SIGNATURE,
  ].join("\n\n");
  return {
    subject: `${code} là mã MemorySave của bạn`,
    text,
    html: layout({
      preheader: `Mã của bạn: ${code} · hiệu lực 10 phút`,
      tag: copy.tag,
      tone: copy.tone,
      title: copy.title,
      content: paragraph(copy.intro) + codeBlock(code) + note(`<strong>Giữ bí mật.</strong> ${NEVER_SHARE}`),
    }),
  };
}

export function emailTakenMail(): MailContent {
  const intro =
    "Có người vừa dùng email này để tạo tài khoản hoặc gắn vào một tài khoản MemorySave, nhưng email này đã có tài khoản rồi.";
  const text = [
    intro,
    "Nếu đó là bạn, hãy đăng nhập vào tài khoản sẵn có. Quên mật khẩu? Dùng mục “Quên mật khẩu” ở trang đăng nhập.",
    FOOTER,
    SIGNATURE,
  ].join("\n\n");
  return {
    subject: "Email này đã có tài khoản MemorySave",
    text,
    html: layout({
      preheader: "Email này đã gắn với một tài khoản MemorySave — không cần tạo thêm.",
      tag: "Thông báo",
      tone: "butter",
      title: "Email này đã có tài khoản",
      content:
        paragraph(intro) +
        paragraph("Nếu đó là bạn:", `font-weight:800;color:${C.ink};margin-bottom:10px`) +
        steps([
          "Đăng nhập vào tài khoản sẵn có bằng tên đăng nhập, hoặc bấm <strong>“Tiếp tục với Google”</strong> nếu đây là Gmail.",
          "Quên mật khẩu? Bấm <strong>“Quên mật khẩu?”</strong> ở trang đăng nhập và nhập email này.",
        ]) +
        note("Thư này không có mã xác thực — mỗi email chỉ dùng được cho một tài khoản MemorySave."),
    }),
  };
}

export function googleAccountMail(): MailContent {
  const intro =
    "Bạn vừa yêu cầu đặt lại mật khẩu MemorySave, nhưng tài khoản dùng email này đăng nhập bằng Google nên không có mật khẩu.";
  const text = [intro, "Hãy mở trang đăng nhập và bấm “Tiếp tục với Google”.", FOOTER, SIGNATURE].join("\n\n");
  return {
    subject: "Tài khoản MemorySave của bạn dùng Google",
    text,
    html: layout({
      preheader: "Tài khoản này đăng nhập bằng Google — không cần mật khẩu.",
      tag: "Đăng nhập",
      tone: "sky",
      title: "Tài khoản của bạn dùng Google",
      content:
        paragraph(intro) +
        steps(["Mở trang đăng nhập MemorySave.", "Bấm <strong>“Tiếp tục với Google”</strong> và chọn đúng tài khoản Google này."]) +
        note("Không cần mật khẩu: Google xác nhận bạn là ai mỗi lần đăng nhập."),
    }),
  };
}
