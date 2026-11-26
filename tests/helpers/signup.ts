// 005 — the two-step sign-up (start → code from the mail → verify) as one call, for tests that just need an account.
import { call } from "./request";
import type { MemoryMailer } from "./memory-mailer";
import { POST as start } from "@/app/api/auth/register/start/route";
import { POST as verify } from "@/app/api/auth/register/verify/route";

export type SignUpInput = { username?: string; password?: string; displayName?: string; email?: string; next?: string };

export function signUpStart(input: SignUpInput, init: { origin?: string | null; headers?: Record<string, string> } = {}) {
  return call(start, "POST", "/api/auth/register/start", { body: input, ...init });
}

export function signUpVerify(ticket: string, code: string) {
  return call(verify, "POST", "/api/auth/register/verify", { body: { ticket, code } });
}

/** Runs both steps; returns the verify response, or the start response when start failed. */
export async function signUp(mailer: MemoryMailer, input: SignUpInput = {}) {
  const body = {
    username: "an_nguyen",
    password: "matkhau123",
    displayName: "An",
    email: `${input.username?.toLowerCase() ?? "an_nguyen"}@example.com`,
    ...input,
  };
  const started = await signUpStart(body);
  if (started.status !== 202) return started;
  const code = mailer.lastCodeFor(body.email.trim().toLowerCase());
  if (!code) throw new Error("No code mailed");
  return signUpVerify(started.body.ticket, code);
}
