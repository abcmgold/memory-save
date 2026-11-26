import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getMailConfig, mailTransport } from "../env";
import type { MailContent } from "./templates";

// 005 research R1 — one interface, three implementations: Gmail SMTP, terminal log (local/test), memory (tests).
export type MailMessage = MailContent;

export interface Mailer {
  send(message: MailMessage & { to: string }): Promise<void>;
}

class SmtpMailer implements Mailer {
  private transporter: Transporter | null = null;
  constructor(private config: { user: string; pass: string; fromName: string }) {}

  async send(message: MailMessage & { to: string }): Promise<void> {
    // Lazily, once per instance; no pool — serverless instances should not hold connections open.
    this.transporter ??= nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: this.config.user, pass: this.config.pass },
    });
    await this.transporter.sendMail({
      // Gmail rewrites any other From address to the account itself, so use it directly.
      from: { name: this.config.fromName, address: this.config.user },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

/** Local development and tests: prints the mail (with its code) to the terminal instead of sending it. */
class LogMailer implements Mailer {
  async send(message: MailMessage & { to: string }): Promise<void> {
    console.info(`[mail] to=${message.to} subject=${message.subject}\n${message.text}\n`);
  }
}

let override: Mailer | null | undefined;
let cached: Mailer | null | undefined;

/** The mailer for this environment, or null when production has no mail settings (FR-E16). */
export function getMailer(): Mailer | null {
  if (override !== undefined) return override;
  if (cached !== undefined) return cached;
  const transport = mailTransport();
  const config = getMailConfig();
  cached = transport === "log" ? new LogMailer() : transport === "smtp" && config ? new SmtpMailer(config) : null;
  return cached;
}

/** Tests: a fake mailer, `null` to simulate "not configured", `undefined` to go back to the default. */
export function setMailerForTests(mailer: Mailer | null | undefined): void {
  override = mailer;
}
