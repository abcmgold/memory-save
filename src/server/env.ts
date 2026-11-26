import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),
  APP_TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),
  // Optional (002-google-login): the Google button is shown only when both are set.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/**
 * Local mode (`npm run dev:local`): embedded Postgres (PGlite over a socket) + photos on disk,
 * so the app runs with no cloud accounts. Never allowed on Vercel / in production builds.
 */
export function isLocalMode(): boolean {
  if (process.env.MS_LOCAL !== "1") return false;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("MS_LOCAL=1 is for local development only.");
  }
  return true;
}

const LOCAL_DEFAULTS = {
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5433/postgres",
  R2_ACCOUNT_ID: "local",
  R2_ACCESS_KEY_ID: "local",
  R2_SECRET_ACCESS_KEY: "local",
  R2_BUCKET: "local",
  CRON_SECRET: "local-development-secret-0123456789",
};

/** Reads and validates environment variables once, on first use (not at import/build time). */
export function getEnv(): Env {
  if (cached) return cached;
  const source = isLocalMode() ? { ...LOCAL_DEFAULTS, ...stripEmpty(process.env) } : process.env;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}\nSee .env.example`);
  }
  cached = parsed.data;
  return cached;
}

function stripEmpty(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string>;
}

/** Google OAuth client, or null when not configured (research R7). Reads process.env directly; never throws. */
export function getGoogleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Time zone is needed by pure domain code and tests; it never throws. */
export function getAppTimeZone(): string {
  return process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";
}
