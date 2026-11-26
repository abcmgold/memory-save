// Pure — the mails MemorySave sends (005 FR-E04, contracts/api.md › Thư). Vietnamese, no links, code in the subject
// so it shows on the phone's notification.
import type { CodePurpose } from "../db/schema";

export type MailContent = { subject: string; text: string; html: string };

const PURPOSE: Record<CodePurpose, string> = {
  signup: "tạo tài khoản MemorySave",
  change_email: "xác thực email cho tài khoản MemorySave",
  reset_password: "đặt lại mật khẩu MemorySave",
};

const FOOTER = "Nếu không phải bạn yêu cầu, hãy bỏ qua thư này — tài khoản của bạn vẫn an toàn.";

function html(paragraphs: string[], code?: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("");
  const box = code
    ? `<p style="margin:0 0 14px;font-size:30px;font-weight:800;letter-spacing:6px;font-family:monospace">${code}</p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${box}${body}</div>`;
}

export function codeMail(purpose: CodePurpose, code: string): MailContent {
  const lines = [
    `Mã để ${PURPOSE[purpose]} của bạn là: ${code}`,
    "Mã có hiệu lực trong 10 phút và chỉ dùng được một lần. Đừng chia sẻ mã này với bất kỳ ai, kể cả người nói là từ MemorySave.",
    FOOTER,
  ];
  return {
    subject: `${code} là mã MemorySave của bạn`,
    text: lines.join("\n\n"),
    html: html(lines.slice(1), code),
  };
}

export function emailTakenMail(): MailContent {
  const lines = [
    "Có người vừa dùng email này để tạo tài khoản hoặc gắn vào một tài khoản MemorySave, nhưng email này đã có tài khoản.",
    "Nếu đó là bạn, hãy đăng nhập vào tài khoản sẵn có. Quên mật khẩu? Dùng mục “Quên mật khẩu” ở trang đăng nhập.",
    FOOTER,
  ];
  return { subject: "Email này đã có tài khoản MemorySave", text: lines.join("\n\n"), html: html(lines) };
}

export function googleAccountMail(): MailContent {
  const lines = [
    "Bạn vừa yêu cầu đặt lại mật khẩu MemorySave, nhưng tài khoản dùng email này đăng nhập bằng Google nên không có mật khẩu.",
    "Hãy mở trang đăng nhập và bấm “Tiếp tục với Google”.",
    FOOTER,
  ];
  return { subject: "Tài khoản MemorySave của bạn dùng Google", text: lines.join("\n\n"), html: html(lines) };
}
