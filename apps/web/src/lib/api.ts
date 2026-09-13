import { getApiUrl, isNextProductionBuild } from "@/lib/env";

type ApiOptions = RequestInit & {
  sessionId?: string;
  token?: string;
  /** Server ISR seconds. Use `false` for no-store. Default: no-store when authed, else 300s. */
  revalidate?: number | false;
  /** Per-attempt abort. During `next build`, GET defaults to 8s so hung Lambdas cannot exceed the SSG timeout. */
  timeoutMs?: number;
};

/** Keep well under Next.js `staticPageGenerationTimeout` (default 60s). */
const BUILD_GET_TIMEOUT_MS = 8_000;

function isIdempotentMethod(method?: string): boolean {
  const m = (method ?? "GET").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

function requestSignal(existing: AbortSignal | null | undefined, timeoutMs: number | undefined): AbortSignal | undefined {
  if (!timeoutMs) return existing ?? undefined;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!existing) return timeoutSignal;
  return AbortSignal.any([existing, timeoutSignal]);
}

/**
 * Retry only network failures (and transient 5xx on idempotent GETs).
 * Always return the final Response — including 5xx — so callers can parse `{ error }` bodies.
 * Never retry POST/PUT/PATCH/DELETE on 5xx (avoids duplicate sends like Test Email).
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
  timeoutMs?: number
): Promise<Response> {
  const retryServerErrors = isIdempotentMethod(init.method);
  const building = isNextProductionBuild();
  const maxAttempts = building ? 1 : retryServerErrors ? attempts : 1;
  let lastNetworkError: unknown;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: requestSignal(init.signal, timeoutMs),
      });
      if (res.ok || res.status < 500 || !retryServerErrors || i === maxAttempts - 1) {
        return res;
      }
    } catch (err) {
      lastNetworkError = err;
      if (i === maxAttempts - 1) {
        throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Fetch failed");
      }
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }

  throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Fetch failed");
}

function errorMessageFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  return `API error (${status})`;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { sessionId, token, revalidate, timeoutMs, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (sessionId) headers["X-Session-Id"] = sessionId;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${getApiUrl()}${path}`;

  const isServer = typeof window === "undefined";
  const needsFresh = Boolean(sessionId || token || revalidate === false);
  const cacheOptions: Pick<RequestInit, "cache" | "next"> = needsFresh
    ? { cache: "no-store" }
    : isServer
      ? { next: { revalidate: typeof revalidate === "number" ? revalidate : 300 } }
      : { cache: "default" };

  const buildTimeout =
    timeoutMs ??
    (isNextProductionBuild() && isIdempotentMethod(fetchOptions.method) ? BUILD_GET_TIMEOUT_MS : undefined);

  const res = await fetchWithRetry(
    url,
    {
      ...fetchOptions,
      headers,
      ...cacheOptions,
    },
    3,
    buildTimeout
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errorMessageFromBody(errBody, res.status));
  }

  return res.json();
}

export { getApiUrl as API_URL };
