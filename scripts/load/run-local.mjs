/**
 * Node concurrent smoke (no k6 required).
 * Usage: API_BASE=http://localhost:3001 node scripts/load/run-local.mjs
 *
 * Mimics a reduced S1 (browse) + cart burst for local validation of LOAD_TEST_MODE / caching.
 */
const API = process.env.API_BASE || "http://localhost:3001";
const CATEGORY = process.env.CATEGORY_SLUG || "single-rakhi";
const CONCURRENCY = Number(process.env.CONCURRENCY || 50);
const LOOPS = Number(process.env.LOOPS || 5);

async function one(session) {
  const headers = { "X-Session-Id": session, "Content-Type": "application/json" };
  const times = [];
  const mark = async (name, fn) => {
    const t0 = Date.now();
    const res = await fn();
    const ms = Date.now() - t0;
    times.push({ name, ms, status: res.status });
    if (res.status >= 500) throw new Error(`${name} ${res.status}`);
    return res;
  };

  await mark("health", () => fetch(`${API}/health`));
  await mark("categories", () => fetch(`${API}/categories`, { headers }));
  const list = await mark("products", () =>
    fetch(`${API}/products?category=${CATEGORY}`, { headers })
  );
  const body = await list.json().catch(() => ({}));
  const slug = body.products?.[0]?.slug;
  if (slug) {
    await mark("pdp", () => fetch(`${API}/products/${slug}`, { headers }));
    await mark("cart_add", () =>
      fetch(`${API}/cart/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ productSlug: slug, quantity: 1 }),
      })
    );
    await mark("cart_get", () => fetch(`${API}/cart`, { headers }));
  }
  await mark("events", () =>
    fetch(`${API}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        events: [{ type: "page_view", sessionId: session, path: "/products", at: new Date().toISOString() }],
      }),
    })
  );
  return times;
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

async function main() {
  console.log(`Local load: ${CONCURRENCY} concurrent × ${LOOPS} loops → ${API}`);
  const health = await fetch(`${API}/health`).catch(() => null);
  if (!health?.ok) {
    console.error("API not reachable. Start with: npm run setup:local && npm run dev:api");
    process.exit(1);
  }

  const allMs = [];
  let errors = 0;
  for (let loop = 0; loop < LOOPS; loop++) {
    const batch = Array.from({ length: CONCURRENCY }, (_, i) =>
      one(`node-lt-${loop}-${i}-${Date.now()}`).catch((err) => {
        errors += 1;
        console.error(String(err.message || err));
        return [];
      })
    );
    const results = await Promise.all(batch);
    for (const times of results) {
      for (const t of times) allMs.push(t.ms);
    }
    console.log(`loop ${loop + 1}/${LOOPS} done`);
  }

  allMs.sort((a, b) => a - b);
  const failedRate = errors / (CONCURRENCY * LOOPS);
  console.log(
    JSON.stringify(
      {
        requestsApprox: allMs.length,
        errors,
        failedRate,
        p50: pct(allMs, 50),
        p95: pct(allMs, 95),
        p99: pct(allMs, 99),
        pass: failedRate < 0.01 && pct(allMs, 95) < 2000,
      },
      null,
      2
    )
  );
  if (failedRate >= 0.01 || pct(allMs, 95) >= 2000) process.exit(2);
}

main();
