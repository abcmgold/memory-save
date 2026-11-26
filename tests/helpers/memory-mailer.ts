// 005 — captures mails instead of sending them; lets tests read codes and simulate SMTP failures.
import { setMailerForTests, type MailMessage, type Mailer } from "@/server/mail/mailer";

export class MemoryMailer implements Mailer {
  sent: (MailMessage & { to: string })[] = [];
  fail = false;

  async send(message: MailMessage & { to: string }): Promise<void> {
    if (this.fail) throw new Error("SMTP down (test)");
    this.sent.push(message);
  }

  to(email: string) {
    return this.sent.filter((m) => m.to === email);
  }

  /** The 6-digit code in the latest mail to this address (from its subject), or null. */
  lastCodeFor(email: string): string | null {
    const last = this.to(email).at(-1);
    return last ? (/\b([0-9]{6})\b/.exec(last.subject)?.[1] ?? null) : null;
  }
}

/** Installs a fresh MemoryMailer for the current test and returns it. */
export function installMemoryMailer(): MemoryMailer {
  const m = new MemoryMailer();
  setMailerForTests(m);
  return m;
}
