// Pure, browser-safe. 005 research R10 — "nguyenvanan@gmail.com" → "n•••@gmail.com", shown back to the person who typed it.
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  return `${local[0]}${"•".repeat(Math.min(3, local.length - 1))}${email.slice(at)}`;
}
