# HR E-Commerce Platform — Architecture

## Goals

- Full-featured e-commerce (catalog, cart, checkout, orders, admin)
- Dual payment gateways: **Stripe** (USA) and **Razorpay** (India), region-configurable
- Customer capture at every touchpoint (partial name/email saved for outreach)
- **SEO-first** storefront (SSR, metadata, sitemap, structured data)
- **AI-driven development**: developers use Cursor prompts; no manual redeploy for code edits
- **Multi-developer**: Git + branch workflow; Cursor rules keep changes consistent
- **AWS serverless**, near-zero idle cost, auto-scales under load

## Why This Stack

| Layer | Choice | Idle cost | Rationale |
|-------|--------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | ~$0 on Amplify/OpenNext | SSR/SSG for SEO; deploy from GitHub without Docker |
| API | API Gateway + Lambda | $0 | Pay per request |
| Database | DynamoDB on-demand | ~$0 | No provisioned capacity; no RDS always-on cost |
| Auth | Cognito User Pool | Free tier | Login/logout, JWT, admin roles |
| Files | S3 + CloudFront | Pennies | Sized WebP variants; originals never served on listing pages |
| Payments | Stripe + Razorpay | $0 until transaction | Config-driven per region |
| IaC | AWS SAM | $0 | Simpler than raw CloudFormation for serverless |
| CI/CD | GitHub Actions | Free tier | Push → deploy infra + app |

**No Docker for app code** — GitHub Actions builds and deploys directly. Cursor edits code → push → auto deploy. Docker only if you later need custom runtimes (not required now).

## Repository Layout

```
spicycorner/
├── AGENTS.md                 # Instructions for Cursor AI
├── apps/
│   ├── web/                  # Next.js storefront + admin
│   └── api/                  # Lambda handlers (TypeScript)
├── packages/
│   └── shared/               # Types, constants, validation (Zod)
├── infrastructure/
│   ├── template.yaml         # SAM: DynamoDB, Cognito, Lambda, S3, API GW
│   └── samconfig.toml
├── .cursor/rules/            # Persistent AI coding rules
├── .github/workflows/        # deploy.yml
└── docs/
```

**Files:** S3 + CloudFront (product images). Upload-time Lambda writes WebP variants (`thumb` 320 / `card` 640 / `gallery` 1200 / `zoom` 1600). Listing pages must use `card`/`thumb`, never the original. Do not use Lambda@Edge for resize — that bills on every cache miss during peak traffic.

## Product image standard

| Role | Max edge | Format | Typical size | Where used |
|------|----------|--------|--------------|------------|
| `thumb` | 320px | WebP q70 | ~15–40KB | Cart, admin lists, PDP filmstrip |
| `card` | 640px | WebP q72 | ~30–80KB | Category / home cards |
| `gallery` | 1200px | WebP q78 | ~60–150KB | Product page main image |
| `zoom` | 1600px | WebP q80 | ~80–200KB | Lightbox |
| original | 2000px | JPEG/WebP | ≤350KB target, 8MB hard cap | Fallback only |

Lambda: `spicycorner-image-optimize-{env}` on S3 Object Created (EventBridge). Backfill: `npm run backfill:image-variants`.

## DynamoDB Multi-Table Design

Per-domain tables (`PAY_PER_REQUEST`), named `spicycorner-<domain>-{env}` and wired into
the Lambda via env vars (`PRODUCTS_TABLE`, `ORDERS_TABLE`, `CARTS_TABLE`,
`CUSTOMERS_TABLE`, `EVENTS_TABLE`, `CONFIG_TABLE`).

| Table | PK | SK | Notes / GSIs |
|-------|----|----|--------------|
| products | `PRODUCT#<slug>` / `CATEGORY#<slug>` | `META` | GSI1 `CATEGORY#<slug>` → products |
| orders | `ORDER#<orderId>` | `META` | GSI1 byCustomer (`USER#<key>`), GSI2 byDate (`ENTITY#ORDER`), GSI3 byStatus (`STATUS#<status>`) |
| carts | `CART#<userKey>` | `META` | GSI1 byUpdatedAt (`ENTITY#CART`) + `itemCount`; TTL `expiresAt` |
| customers | `SESSION#<sessionId>` | `PROFILE` / `LEAD#<ts>` | GSI1 lead feed (`ENTITY#LEAD`) |
| events | `SESSION#<sessionId>` | `<ts>#<eventId>` | GSI1 byTypeDay (`<type>#<yyyy-mm-dd>`); TTL `expiresAt` (90d). Rollups: PK `ROLLUP#<yyyy-mm-dd>` |
| config | `CONFIG#PAYMENTS` | `META` | Stripe/Razorpay settings |

Order status lifecycle: `pending_payment → paid → processing → shipped → delivered`
(plus `cancelled` / `refunded`), with a `statusHistory[]` audit trail and tracking number.

Migration from the legacy single table: `npm run migrate:multitable` (copies orders +
leads/sessions; products re-seed via `import:usarakhi`).

## Background jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `ReviewEmailsCronFunction` | Every 15 min + hourly Razorpay reconcile + hourly homepage ranking | Review emails, abandoned carts, pending-payment reminders; Razorpay safety net; homepage ranking snapshot |

When admin sets order status to **Delivered** or **Complete**, the API sets `reviewEmailDueAt` (delivery + 1 day). The cron sends one email per order (tracked via `reviewEmailSentAt`).

## API Routes (Lambda)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/cj/products` | Storefront CJ catalog (list/search; `?limit=&offset=&sort=` — shop/category first page ~24, later chunks of 24) |
| GET | `/cj/products/{slug}` | Storefront CJ product detail |
| GET | `/cj/products/{slug}/videos` | CJ videos for the PDP gallery (copies to CDN; hydrates Dynamo if import skipped them) |
| GET | `/cj/products/{slug}/shipping` | CJ freight methods, USD cost, and transit time (cached) |
| GET | `/products` | Alias of `/cj/products` (admin CRUD still uses POST/PUT/DELETE here) |
| GET | `/products/{slug}` | Alias of `/cj/products/{slug}` |
| POST | `/products` | Admin: create product |
| PUT | `/products/{slug}` | Admin: update |
| DELETE | `/products/{slug}` | Admin: delete |
| POST | `/products/bulk` | Admin: CSV bulk upload |
| GET | `/categories` | List categories |
| POST | `/categories` | Admin: create |
| GET | `/cart` | Get cart |
| POST | `/cart/items` | Add to cart |
| DELETE | `/cart/items/{id}` | Remove item |
| POST | `/checkout` | Create order + payment intent |
| POST | `/coupons/validate` | Validate coupon at checkout (email or phone) |
| POST | `/admin/coupons/abandoned` | Admin: outreach / confirmed-sale coupon |
| GET | `/admin/coupons/abandoned` | Admin: list admin coupons |
| POST | `/admin/coupons/test-order` | Admin: 20-minute $1 test-order coupon (items + shipping) |
| POST | `/webhooks/stripe` | Stripe webhook |
| POST | `/webhooks/razorpay` | Razorpay webhook |
| POST | `/webhooks/cj` | CJ Dropshipping product/stock/order/logistics webhook |
| GET | `/admin/cj/status` | Admin: CJ API connection status |
| PUT | `/admin/cj/api-key` | Admin: save CJ API key |
| GET | `/admin/cj/products` | Admin: search CJ catalog (500 per page; already-imported flagged) |
| POST | `/admin/cj/products/import` | Admin: queue selected CJ pids (returns 202 + jobId; worker imports in background) |
| POST | `/admin/cj/products/import-spice` | Admin: queue one spice catalog page |
| GET | `/admin/cj/imports` | Admin: list CJ import jobs |
| GET | `/admin/cj/imports/{jobId}` | Admin: one CJ import job with per-product status |
| GET | `/admin/cj/orders` | Admin: list CJ shopping orders |
| POST | `/admin/cj/orders/{orderId}/fulfill` | Admin: create a CJ fulfillment order from a SpicyCorner order |
| GET | `/admin/eprolo/status` | Admin: Eprolo Open API connection ping |
| PUT | `/admin/eprolo/credentials` | Admin: save Eprolo openApiKey + openApiSecret |
| POST | `/leads` | Save partial customer info |
| POST | `/events` | First-party analytics events (batched, public) |
| GET | `/orders` | User orders |
| GET | `/orders/{orderId}` | Order detail (owner/admin) |
| GET | `/admin/orders` | Admin: list orders (filter `?status=`) |
| GET | `/admin/orders/{orderId}` | Admin: order detail |
| PATCH | `/admin/orders/{orderId}` | Admin: update status + tracking (schedules review email 1 day after delivered) |
| GET | `/admin/analytics/sales` | Admin: day/week/month payments received (excludes refunds) |
| GET | `/admin/analytics/overview` | Admin: traffic + funnel (`?days=`) |
| GET | `/admin/analytics/products` | Admin: most-viewed products (legacy rollup) |
| GET | `/admin/analytics/performance` | Admin: product performance scores + funnel (`?days=`) |
| GET | `/admin/analytics/performance/{slug}` | Admin: one product + geo drill-down |
| GET | `/admin/analytics/merchandising` | Admin: quadrants, countries, SEO opportunities |
| GET | `/admin/homepage-ranking` | Admin: ranking weights / slot config |
| PUT | `/admin/homepage-ranking` | Admin: save ranking config and refresh snapshot |
| POST | `/admin/homepage-ranking/refresh` | Admin: rebuild homepage snapshot |
| GET | `/homepage/products` | Storefront ranked homepage feed (`?limit=&offset=`; first page ~40 products, later chunks of 24). Snapshot is included on `offset=0` only. |
| GET | `/admin/analytics/chat` | Admin: shopping assistant sessions, intents, unfulfilled searches |
| GET | `/config/chat` | Public assistant config (enabled flags) |
| PUT | `/admin/config/chat` | Admin: save assistant settings |
| GET | `/admin/sessions` | Admin: recent visitor sessions |
| GET | `/admin/sessions/{sessionId}` | Admin: full visitor journey |
| GET | `/admin/carts/abandoned` | Admin: abandoned carts (CSV in UI) |
| GET | `/admin/leads` | Admin: captured leads |
| GET | `/config/payments` | Public payment region config |

## Payment Flow

1. Checkout reads `CONFIG#PAYMENTS` → region (`US` → Stripe, `IN` → Razorpay)
2. Create order in DynamoDB (status: `pending_payment`)
3. Create Stripe PaymentIntent or Razorpay Order
4. Client completes payment
5. Webhook confirms → order status `paid` → inventory decrement

Secrets (Stripe/Razorpay keys) live in **SSM Parameter Store** / **Secrets Manager**, never in code.

## Customer / Lead Capture

Every form blur or debounced keystroke can POST to `/leads`:

- Anonymous `sessionId` (cookie) + optional `userId` after login
- Fields: name (partial OK), email, phone, page, product viewed
- Stored as `LEAD#` and `SESSION#` for CRM-style outreach

## SEO

- Next.js `generateMetadata` per product/category page
- `/sitemap.xml`, `/robots.txt` dynamic routes
- JSON-LD Product schema on product pages
- Canonical URLs, Open Graph tags

## Multi-Developer + Cursor Workflow

1. Clone repo, open in Cursor
2. Read `AGENTS.md` and `.cursor/rules/`
3. Log into admin portal locally or staging
4. Prompt: *"Add wishlist feature"* or *"Improve checkout UX"*
5. Cursor edits `apps/web` and `apps/api` following conventions
6. Push branch → PR → GitHub Actions deploys to staging
7. Multiple devs: feature branches, shared types in `packages/shared`

Admin credentials for staging are in team 1Password / SSM — developers never share source code in prompts; Cursor has repo access.

## AWS Deployment (GitHub Actions)

```
push main → build shared → build api → sam deploy → build web → Amplify/OpenNext deploy
```

### Estimated Monthly Cost (Low Traffic / Idle)

| Service | ~Cost |
|---------|-------|
| DynamoDB on-demand | $0–5 |
| Lambda + API GW | $0–3 |
| S3 + CloudFront | $1–5 |
| Cognito | $0 (under 50k MAU) |
| **Total idle/low** | **~$0–15/mo** |

Scales automatically; no manual intervention.

## Environment Variables

See `apps/web/.env.example` and `infrastructure/template.yaml` Parameters section.

## Future Extensions (prompt-ready)

- Wishlist, reviews, coupons, inventory alerts
- Email (SES), SMS (SNS)
- **Multi-warehouse + multi-vendor**: warehouses, vendors, and country markets live in the config table (`WAREHOUSE#`, `VENDOR#`, `MARKET#`). Admin portal: `/admin/network`. Public country selector uses `GET /markets`. Existing product URLs and USD/INR checkout are unchanged.
- Analytics (Plausible / GA4)
- Abandoned cart emails
