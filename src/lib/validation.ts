// Pure, browser-safe form rules shared by the forms (instant feedback) and the server schemas (the authority).
// Each validator returns a Vietnamese message, or null when the value is fine.
import { MAX_DISPLAY_NAME, MAX_EMAIL, MAX_PASSWORD, MIN_PASSWORD, msg } from "./messages";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/; // data-model.md › users.username

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Same shape zod's z.email() accepts: no leading/double dots, a dotted domain with a 2+ letter TLD.
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)[a-z0-9_'+\-.]*[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/;

/** True for a normalized, well-formed address of at most 254 characters (005 data-model.md › users.email). */
export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL && email === normalizeEmail(email) && EMAIL_PATTERN.test(email);
}

export function checkUsername(value: string): string | null {
  if (!value.trim()) return msg.usernameRequired;
  return isValidUsername(normalizeUsername(value)) ? null : msg.usernameFormat;
}

export function checkDisplayName(value: string): string | null {
  const v = value.trim();
  if (!v) return msg.displayNameRequired;
  return v.length > MAX_DISPLAY_NAME ? msg.displayNameTooLong : null;
}

export function checkEmail(value: string): string | null {
  if (!value.trim()) return msg.emailRequired;
  return isValidEmail(normalizeEmail(value)) ? null : msg.emailInvalid;
}

export function checkNewPassword(value: string): string | null {
  if (value.length < MIN_PASSWORD) return msg.passwordTooShort;
  return value.length > MAX_PASSWORD ? msg.passwordTooLong : null;
}

export function checkPasswordConfirm(password: string, confirm: string): string | null {
  return password === confirm ? null : msg.passwordMismatch;
}

export function checkCode(value: string): string | null {
  return /^[0-9]{6}$/.test(value.replace(/\s+/g, "")) ? null : msg.codeFormat;
}

/** Runs a set of checks; returns only the fields that failed (empty object = all good). */
export function collectErrors(checks: Record<string, string | null>): Record<string, string> {
  return Object.fromEntries(Object.entries(checks).filter((e): e is [string, string] => e[1] !== null));
}
