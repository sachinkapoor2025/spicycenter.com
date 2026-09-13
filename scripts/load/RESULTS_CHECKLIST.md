# Checklist — fill after each k6 run (staging preferred)

## Environment
- [x] Target API: `http://127.0.0.1:3011` (local memory DB + LOAD_TEST_MODE)
- [x] LOAD_TEST_MODE=true on API: yes
- [x] Date/time (UTC): 2026-07-15 ~15:56Z
- [ ] Staging 1000 VU run: pending (install k6 + `sam deploy --config-env staging`)

## Baseline (idle 15m)
- N/A for local memory DB

## Runs completed (local)
| Scenario | Command | VUs | http_req_failed | p95 ms | Pass? |
|----------|---------|-----|-----------------|--------|-------|
| Local mix | `CONCURRENCY=30 LOOPS=3 npm run load:local` | 30×3 | 0% | 10 | YES |
| Smoke + burst | `npm run load:smoke` | 50 concurrent | 0% | — | YES |
| S1–S5 k6 @ 1000 | Requires `brew install k6` + staging | — | — | — | pending |

## Pass criteria (S3 @ 1000 — run on staging)
- [ ] Failed rate < 1%
- [ ] API p95 < 2000ms
- [ ] Lambda throttles ≈ 0
- [ ] DynamoDB throttles ≈ 0

## Hotspot fixes shipped with this work
- Product list 60s in-memory cache (avoids Scan storm)
- Category list via GSI1 `ENTITY#CATEGORY` (no Scan) + lazy backfill
- Category product Query cache + PDP Get cache (30–60s per warm instance)
- `Cache-Control` on public catalog GETs
- Cart add: parallel Gets + single Put
- Event `page_view` rollups sampled (~20%) to protect Dynamo hot partition
- SSR revalidate=60 on home/products/categories/PDP
- LOAD_TEST_MODE stubs: Stripe, Razorpay, USPS, SMTP
- Event rollups skipped in LOAD_TEST_MODE
- Lambda memory 1024MB (no provisioned concurrency — optional later for cold-start p95)
- Admin load presets: Smoke, 100, 250, 500, 750, 1000 with tiered p95 gates

## Staging 1000 VU commands
```bash
brew install k6
sam build && sam deploy --config-env staging
export API_BASE=https://YOUR_STAGING_API/.../staging
npm run load:warmup
VUS=1000 npm run load:browse
VUS=1000 npm run load:mixed
npm run load:spike
```
