import "server-only";
import { z } from "zod";
import { msg, MAX_DISPLAY_NAME, MAX_PASSWORD, MIN_PASSWORD } from "@/lib/messages";
import { isValidUsername, normalizeUsername } from "../domain/username";
import { normalizeEmail } from "../domain/email-code";
import { checkEmail } from "@/lib/validation";

export const usernameField = z
  .string({ error: msg.usernameFormat })
  .transform(normalizeUsername)
  .refine(isValidUsername, { message: msg.usernameFormat });

const displayNameField = z
  .string({ error: msg.displayNameRequired })
  .trim()
  .min(1, msg.displayNameRequired)
  .max(MAX_DISPLAY_NAME, msg.displayNameTooLong);

const passwordField = z
  .string({ error: msg.passwordTooShort })
  .min(MIN_PASSWORD, msg.passwordTooShort)
  .max(MAX_PASSWORD, msg.passwordTooLong);

/** 005 data-model.md › users.email — normalized (trim + lower-case), well-formed, ≤ 254 characters. */
export const emailField = z
  .string({ error: msg.emailRequired })
  .max(400, msg.emailInvalid)
  .transform(normalizeEmail)
  .superRefine((email, ctx) => {
    const problem = checkEmail(email); // same rule and message as the forms: empty → "không được để trống"
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const ticketField = z.string().min(1).max(100);
const codeField = z.string({ error: msg.codeFormat }).regex(/^[0-9]{6}$/, msg.codeFormat);

/** 005 contracts/api.md › POST /api/auth/register/start */
export const SignupStartBody = z.object({
  username: usernameField,
  password: passwordField,
  displayName: displayNameField,
  email: emailField,
  next: z.string().max(2000).nullish(),
});

/** 005 contracts/api.md › POST /api/auth/register/verify, /api/me/email/verify */
export const CodeVerifyBody = z.object({ ticket: ticketField, code: codeField });

export const ResendBody = z.object({ ticket: ticketField });

/** 005 contracts/api.md › POST /api/auth/password-reset/start, /api/me/email/start */
export const EmailOnlyBody = z.object({ email: emailField });

/** 005 contracts/api.md › POST /api/auth/password-reset/verify — same password rule as sign-up */
export const ResetVerifyBody = z.object({ ticket: ticketField, code: codeField, password: passwordField });

/** 002 contracts/api.md › POST /api/auth/google/complete — same name rule as sign-up (FR-G03). */
export const GoogleCompleteBody = z.object({ displayName: displayNameField });

export const LoginBody = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const uuidParam = z.uuid();
