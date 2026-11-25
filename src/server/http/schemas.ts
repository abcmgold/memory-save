import "server-only";
import { z } from "zod";
import { msg, MAX_DISPLAY_NAME } from "@/lib/messages";
import { isValidUsername, normalizeUsername } from "../domain/username";

export const usernameField = z
  .string({ error: msg.usernameFormat })
  .transform(normalizeUsername)
  .refine(isValidUsername, { message: msg.usernameFormat });

export const RegisterBody = z.object({
  username: usernameField,
  password: z.string({ error: msg.passwordTooShort }).min(8, msg.passwordTooShort).max(200, msg.passwordTooLong),
  displayName: z
    .string({ error: msg.displayNameRequired })
    .trim()
    .min(1, msg.displayNameRequired)
    .max(MAX_DISPLAY_NAME, msg.displayNameTooLong),
});

export const LoginBody = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const uuidParam = z.uuid();
