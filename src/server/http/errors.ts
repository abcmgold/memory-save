import "server-only";
import { ZodError } from "zod";
import { msg, type ErrorCode } from "@/lib/messages";

/** A failure the client should see, mapped to the contract's error table (contracts/api.md). */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  validation: (message: string = msg.validation, fields?: Record<string, string>) =>
    new AppError(400, "VALIDATION", message, fields),
  unauthenticated: () => new AppError(401, "UNAUTHENTICATED", msg.unauthenticated),
  invalidCredentials: () => new AppError(401, "INVALID_CREDENTIALS", msg.invalidCredentials),
  badOrigin: () => new AppError(403, "BAD_ORIGIN", msg.badOrigin),
  /** Used for both "does not exist" and "not allowed" — never reveal which (FR-031). */
  notFound: () => new AppError(404, "NOT_FOUND", msg.notFound),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  tooLarge: (message: string = msg.photoTooLarge) => new AppError(413, "TOO_LARGE", message),
  unsupportedType: (message: string = msg.photoUnsupported) => new AppError(415, "UNSUPPORTED_TYPE", message),
  rule: (message: string, fields?: Record<string, string>) => new AppError(422, "RULE", message, fields),
  rateLimited: () => new AppError(429, "RATE_LIMITED", msg.rateLimited),
};

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json(
      { error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } },
      { status: err.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    return Response.json(
      { error: { code: "VALIDATION", message: msg.validation, fields } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("[unhandled]", err);
  return Response.json(
    { error: { code: "INTERNAL", message: msg.internal } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
