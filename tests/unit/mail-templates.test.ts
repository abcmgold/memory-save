// 005 FR-E04, contracts/api.md › Thư — Vietnamese mails, code only where it belongs, never a link
import { describe, expect, it } from "vitest";
import { codeMail, emailTakenMail, googleAccountMail } from "@/server/mail/templates";

const SIX_DIGITS = /\b[0-9]{6}\b/;

describe("codeMail", () => {
  for (const purpose of ["signup", "change_email", "reset_password"] as const) {
    it(`carries the code, the 10-minute limit and no link (${purpose})`, () => {
      const m = codeMail(purpose, "042137");
      expect(m.subject).toContain("042137");
      expect(m.text).toContain("042137");
      expect(m.html).toContain("042137");
      expect(m.text).toMatch(/10 phút/);
      expect(m.text).toMatch(/không chia sẻ|đừng chia sẻ/i);
      expect(`${m.text}${m.html}`).not.toMatch(/https?:/);
    });
  }

  it("names the purpose so the reader knows why it arrived", () => {
    expect(codeMail("signup", "111111").text).toMatch(/tạo tài khoản/);
    expect(codeMail("change_email", "111111").text).toMatch(/email/);
    expect(codeMail("reset_password", "111111").text).toMatch(/mật khẩu/);
  });

  it("is a full branded HTML mail, not just text (no scripts, images or links)", () => {
    const { html } = codeMail("signup", "042137");
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('lang="vi"');
    expect(html).toContain("MemorySave");
    expect(html).toContain("Chào mừng bạn đến MemorySave");
    expect(html).toMatch(/Mã của bạn: 042137/); // inbox preview line
    expect(html).not.toMatch(/<script|<img|<a\s/i);
  });
});

describe("mails without a usable code", () => {
  it("'already has an account' contains no 6-digit code and no link", () => {
    const m = emailTakenMail();
    expect(m.subject).toMatch(/đã có tài khoản/);
    expect(`${m.subject}${m.text}${m.html}`).not.toMatch(SIX_DIGITS);
    expect(`${m.text}${m.html}`).not.toMatch(/https?:/);
    expect(m.text).toMatch(/Quên mật khẩu/);
  });

  it("'your account uses Google' contains no code and no link", () => {
    const m = googleAccountMail();
    expect(m.subject).toMatch(/Google/);
    expect(`${m.subject}${m.text}${m.html}`).not.toMatch(SIX_DIGITS);
    expect(`${m.text}${m.html}`).not.toMatch(/https?:/);
    expect(m.text).toMatch(/Tiếp tục với Google/);
  });
});
