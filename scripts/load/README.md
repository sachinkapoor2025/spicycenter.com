# Load testing — SpicyCorner (~1000 concurrent shoppers)

Festival-style traffic: browse + cart + light checkout start. **Do not** enable `LOAD_TEST_MODE` on production.

## Targets

| Env | API | Notes |
|-----|-----|--------|
| Local | `http://localhost:3001` | `npm run setup:local && npm run dev:api` — memory DB stubs externals |
| Staging | SAM stack `spicycorner-staging` | Prefer this for 1000 VU runs |
| Prod | Only off-peak, short, **never** with `LOAD_TEST_MODE` creating junk orders | Prefer staging |

Staging deploy:

```bash
cd infrastructure
sam build && sam deploy --config-env staging \
  --parameter-overrides "Environment=staging LoadTestMode=true"
```

## Baseline metrics (capture before load)

CloudWatch (us-east-1), ~15 minutes idle:

- Lambda `spicycorner-api-staging` (or `-prod`): `ConcurrentExecutions`, `Duration`, `Errors`, `Throttles`
- DynamoDB tables `spicycorner-*-staging`: `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`, `ThrottledRequests`
- Amplify app 4xx/5xx if hitting SSR URLs

## Install k6

```bash
# macOS
brew install k6

# verify
k6 version
```

## Scenarios

| Script | Command | Intent |
|--------|---------|--------|
| Warmup S1 | `k6 run scripts/load/warmup.js` | 50→200 browse |
| Browse S2 | `k6 run -e VUS=1000 scripts/load/browse.js` | Ramp to 1000 browse |
| Mix S3 | `k6 run -e VUS=1000 scripts/load/mixed.js` | 70/20/10 browse/cart/checkout-start |
| Spike S5 | `k6 run scripts/load/spike.js` | 200→1000 in 60s |
| SSR sample | `k6 run -e VUS=300 scripts/load/ssr.js` | Hit Amplify/Next pages |

Env vars:

```bash
export API_BASE=https://YOUR_API.execute-api.us-east-1.amazonaws.com/staging
export WEB_BASE=https://your-amplify-url.amplifyapp.com   # for ssr.js only
export PRODUCT_SLUG=blue-sapphire-pearl-single-rakhi     # optional known slug
export CATEGORY_SLUG=single-rakhi
```

Save results:

```bash
k6 run --summary-export=scripts/load/results/mixed-summary.json scripts/load/mixed.js
```

## Pass / fail (S3 steady 1000 VUs, 10–15 min)

- `http_req_failed` (5xx) **&lt; 1%**
- API p95 **&lt; 2s** for `/products` and PDP
- SSR p95 **&lt; 4s** (ssr.js)
- Lambda throttles ≈ 0
- DynamoDB throttled requests ≈ 0

## LOAD_TEST_MODE

When `LOAD_TEST_MODE=true` on the API Lambda:

- Stripe / Razorpay return fake payment ids (no real charges)
- USPS rate shopping skipped (flat/free fallback)
- SMTP admin/customer emails skipped

Local memory DB (`USE_MEMORY_DB=true`) also stubs unless `LOAD_TEST_MODE=false`.

## Observing during a run

```bash
aws cloudwatch get-metric-statistics --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions --dimensions Name=FunctionName,Value=spicycorner-api-staging \
  --start-time ... --end-time ... --period 60 --statistics Maximum
```

Also watch DynamoDB throttles on products / carts / events tables.
