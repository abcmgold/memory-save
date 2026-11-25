import "server-only";
import { errorResponse, errors } from "./errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Host the request was addressed to (Vercel sets x-forwarded-host). */
function requestHost(req: Request): string {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
}

/** CSRF guard: mutating requests MUST carry an Origin matching our host (research.md R4). */
export function checkOrigin(req: Request): void {
  if (!MUTATING.has(req.method.toUpperCase())) return;
  const origin = req.headers.get("origin");
  if (!origin) throw errors.badOrigin();
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw errors.badOrigin();
  }
  if (originHost !== requestHost(req)) throw errors.badOrigin();
}

export function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw errors.validation();
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a Route Handler: origin check + uniform error mapping. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      checkOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

export function noContent(headers?: HeadersInit): Response {
  return new Response(null, { status: 204, headers });
}
