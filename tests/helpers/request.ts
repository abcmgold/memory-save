// Builds standard Requests and calls Route Handlers directly (no server needed).
export const ORIGIN = "http://localhost:3000";

type Init = {
  body?: unknown;
  cookie?: string;
  origin?: string | null;
  headers?: Record<string, string>;
};

export function makeRequest(method: string, path: string, init: Init = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("host", "localhost:3000");
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  if (init.cookie) headers.set("cookie", init.cookie);
  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.body);
  }
  return new Request(ORIGIN + path, { method, headers, body });
}

type RouteFn<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;

/** Calls a Route Handler with optional dynamic params and returns status + parsed JSON. */
export async function call<P extends Record<string, string> = Record<string, string>>(
  handler: RouteFn<P>,
  method: string,
  path: string,
  init: Init & { params?: P } = {},
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests read arbitrary JSON shapes
): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await handler(makeRequest(method, path, init), { params: Promise.resolve((init.params ?? {}) as P) });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body, headers: res.headers };
}

/** Extracts "ms_session=<token>" from a Set-Cookie header for use in later requests. */
export function sessionCookieFrom(headers: Headers): string {
  const setCookie = headers.get("set-cookie") ?? "";
  const match = /ms_session=([^;]*)/.exec(setCookie);
  if (!match) throw new Error("No session cookie in response");
  return `ms_session=${match[1]}`;
}
