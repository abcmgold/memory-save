import { timingSafeEqual } from "node:crypto";
import { route, json } from "@/server/http/request";
import { errors } from "@/server/http/errors";
import { getEnv } from "@/server/env";
import { runCleanup } from "@/server/services/cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const expected = Buffer.from(`Bearer ${getEnv().CRON_SECRET}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called once a day by Vercel Cron (vercel.json). */
export const GET = route(async (req) => {
  if (!authorized(req)) throw errors.unauthenticated();
  return json(await runCleanup());
});
