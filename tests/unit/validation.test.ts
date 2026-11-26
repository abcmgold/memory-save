// Shared form rules (src/lib/validation.ts) — the forms and the server schemas must agree.
import { describe, expect, it } from "vitest";
import { msg } from "@/lib/messages";
import {
  checkCode,
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  checkPasswordConfirm,
  checkUsername,
  collectErrors,
} from "@/lib/validation";
import { SignupStartBody } from "@/server/http/schemas";

describe("form rules", () => {
  it("username", () => {
    expect(checkUsername("")).toBe(msg.usernameRequired);
    expect(checkUsername("a b")).toBe(msg.usernameFormat);
    expect(checkUsername("ab")).toBe(msg.usernameFormat);
    expect(checkUsername(" AbcmGold ")).toBeNull();
    expect(checkUsername("@an_nguyen")).toBeNull();
  });

  it("display name, e-mail, password, confirm, code", () => {
    expect(checkDisplayName("  ")).toBe(msg.displayNameRequired);
    expect(checkDisplayName("a".repeat(51))).toBe(msg.displayNameTooLong);
    expect(checkDisplayName("Spiderman")).toBeNull();
    expect(checkEmail("")).toBe(msg.emailRequired);
    expect(checkEmail("an@")).toBe(msg.emailInvalid);
    expect(checkEmail(" An@Gmail.com ")).toBeNull();
    expect(checkNewPassword("1234567")).toBe(msg.passwordTooShort);
    expect(checkNewPassword("x".repeat(201))).toBe(msg.passwordTooLong);
    expect(checkNewPassword("12345678")).toBeNull();
    expect(checkPasswordConfirm("12345678", "12345679")).toBe(msg.passwordMismatch);
    expect(checkPasswordConfirm("12345678", "12345678")).toBeNull();
    expect(checkCode("12 34 56")).toBeNull();
    expect(checkCode("12345")).toBe(msg.codeFormat);
  });

  it("collectErrors keeps only failures", () => {
    expect(collectErrors({ a: null, b: "x" })).toEqual({ b: "x" });
  });

  it("whatever the form accepts, the server accepts too", () => {
    const form = { username: " AbcmGold ", displayName: " Spiderman ", email: " An@Gmail.com ", password: "12345678" };
    expect(
      collectErrors({
        username: checkUsername(form.username),
        displayName: checkDisplayName(form.displayName),
        email: checkEmail(form.email),
        password: checkNewPassword(form.password),
      }),
    ).toEqual({});
    expect(SignupStartBody.safeParse(form).success).toBe(true);
    const empty = SignupStartBody.safeParse({ ...form, email: "  " });
    expect(empty.error?.issues.find((i) => i.path[0] === "email")?.message).toBe("Email không được để trống.");
    const missing = SignupStartBody.safeParse({ ...form, email: undefined });
    expect(missing.error?.issues.find((i) => i.path[0] === "email")?.message).toBe("Email không được để trống.");
    for (const email of ["an@", "an@gmail", ".an@gmail.com", "an..b@gmail.com", ""]) {
      expect(checkEmail(email)).not.toBeNull();
      expect(SignupStartBody.safeParse({ ...form, email }).success).toBe(false);
    }
  });
});
