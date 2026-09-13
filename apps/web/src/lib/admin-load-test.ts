import {
  LOAD_TEST_PRESETS,
  loadTestLimits,
  type LoadTestPreset,
  type LoadTestRunResult,
} from "@spicycorner/shared";
import { getApiUrl } from "@/lib/env";

type StepTiming = { name: string; ms: number; status: number };

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i]!;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry transient API Gateway / Lambda scale-out responses. */
async function fetchRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2
): Promise<Response> {
  let last: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    last = await fetch(input, init);
    if (last.status !== 503 && last.status !== 429) return last;
    if (attempt < retries) {
      await sleep(250 * (attempt + 1) + Math.random() * 250);
    }
  }
  return last!;
}

async function runJourney(
  apiBase: string,
  session: string,
  categorySlug: string
): Promise<StepTiming[]> {
  const headers: Record<string, string> = {
    "X-Session-Id": session,
    "Content-Type": "application/json",
  };
  const times: StepTiming[] = [];

  const mark = async (name: string, fn: () => Promise<Response>) => {
    const t0 = Date.now();
    const res = await fn();
    const ms = Date.now() - t0;
    times.push({ name, ms, status: res.status });
    if (res.status >= 500) throw new Error(`${name} ${res.status}`);
    return res;
  };

  await mark("health", () => fetchRetry(`${apiBase}/health`));
  await mark("categories", () => fetchRetry(`${apiBase}/categories`, { headers }));
  const list = await mark("products", () =>
    fetchRetry(`${apiBase}/products?category=${encodeURIComponent(categorySlug)}`, { headers })
  );
  const body = (await list.json().catch(() => ({}))) as { products?: { slug?: string }[] };
  const slug = body.products?.[0]?.slug;
  if (slug) {
    await mark("pdp", () =>
      fetchRetry(`${apiBase}/products/${encodeURIComponent(slug)}`, { headers })
    );
    await mark("cart_add", () =>
      fetchRetry(`${apiBase}/cart/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ productSlug: slug, quantity: 1 }),
      })
    );
    await mark("cart_get", () => fetchRetry(`${apiBase}/cart`, { headers }));
  }
  await mark("events", () =>
    fetchRetry(`${apiBase}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        events: [
          {
            type: "page_view",
            sessionId: session,
            path: "/products",
            at: new Date().toISOString(),
          },
        ],
      }),
    })
  );

  return times;
}

/** Run `total` tasks with at most `parallel` in flight. */
async function runPool(total: number, parallel: number, worker: (index: number) => Promise<void>) {
  let next = 0;

  async function runOne() {
    while (true) {
      const i = next++;
      if (i >= total) return;
      await worker(i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(parallel, total) }, () => runOne()));
}

function wallClockForUsers(users: number): number {
  if (users >= 1000) return 300_000; // 5 min
  if (users >= 500) return 240_000; // 4 min
  if (users >= 250) return 150_000; // 2.5 min
  return 90_000;
}

/**
 * Runs load from the browser against the public API.
 * High user counts use modest parallel waves so Lambda can scale without a 503 stampede.
 */
export async function runBrowserLoadTest(options: {
  preset: LoadTestPreset;
  categorySlug?: string;
}): Promise<LoadTestRunResult> {
  const preset = options.preset;
  const limits = loadTestLimits(preset);
  const { users, parallel, p95LimitMs, failRateLimit } = limits;
  const categorySlug = options.categorySlug?.trim() || "whole-spices";
  const apiBase = getApiUrl().replace(/\/$/, "");
  const started = Date.now();
  const maxWallMs = wallClockForUsers(users);
  const allMs: number[] = [];
  let errors = 0;
  let journeys = 0;
  let skipped = 0;
  let truncated = false;
  const sampleErrors: string[] = [];

  const health = await fetchRetry(`${apiBase}/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`API health check failed at ${apiBase}`);
  }

  await runPool(users, parallel, async (i) => {
    if (Date.now() - started > maxWallMs) {
      truncated = true;
      skipped += 1;
      return;
    }
    const session = `browser-lt-${preset}-${i}-${started}`;
    try {
      const times = await runJourney(apiBase, session, categorySlug);
      journeys += 1;
      for (const t of times) allMs.push(t.ms);
    } catch (err: unknown) {
      errors += 1;
      const msg = err instanceof Error ? err.message : String(err);
      if (sampleErrors.length < 5) sampleErrors.push(msg);
    }
  });

  allMs.sort((a, b) => a - b);
  // Score only journeys that actually ran — do not treat "skipped due to time" as API errors.
  const attempted = journeys + errors;
  const failedRate = attempted > 0 ? errors / attempted : 1;
  const completionRate = users > 0 ? journeys / users : 0;
  const p50 = percentile(allMs, 50);
  const p95 = percentile(allMs, 95);
  const p99 = percentile(allMs, 99);
  const reliabilityPass =
    attempted > 0 && failedRate <= failRateLimit && completionRate >= 0.9;
  const latencyPass = p95 > 0 && p95 <= p95LimitMs;
  const reasons: string[] = [];
  if (truncated || completionRate < 0.9) {
    reasons.push(
      `Completed ${journeys}/${users} journeys` +
        (skipped ? ` (${skipped} skipped after time limit)` : "") +
        " — re-run or use a smaller preset if this keeps happening"
    );
  }
  if (failedRate > failRateLimit) {
    reasons.push(
      `Error rate ${(failedRate * 100).toFixed(2)}% of attempted journeys exceeds ${(failRateLimit * 100).toFixed(1)}% (503s usually mean Lambda scale-out throttle)`
    );
  }
  if (attempted > 0 && !latencyPass) {
    reasons.push(
      `p95 ${p95} ms exceeds ${p95LimitMs} ms limit for ${LOAD_TEST_PRESETS[preset].label}`
    );
  }
  if (attempted === 0) {
    reasons.push("No journeys completed");
  }

  return {
    preset,
    concurrency: parallel,
    loops: 1,
    users,
    parallel,
    apiBase,
    loadTestMode: false,
    durationMs: Date.now() - started,
    journeys,
    requestsApprox: allMs.length,
    errors,
    skipped: skipped || undefined,
    failedRate,
    p50,
    p95,
    p99,
    pass: reliabilityPass && latencyPass,
    reliabilityPass,
    latencyPass,
    p95LimitMs,
    failRateLimit,
    reasons: reasons.length ? reasons : undefined,
    truncated: truncated || undefined,
    sampleErrors: sampleErrors.length ? sampleErrors : undefined,
  };
}
