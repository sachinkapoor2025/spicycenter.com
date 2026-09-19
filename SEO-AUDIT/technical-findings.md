# Technical findings

**Date:** 19 September 2026  
**Live crawl limitation:** Targeted HTTP checks + homepage text extract. Not a full link crawl. PageSpeed / CrUX not run.

## 1.1 Stack (repository)

| Layer | Choice |
|-------|--------|
| Framework | Next.js **15** App Router (`apps/web`, next ^15.1.3) |
| UI | React 19, Tailwind |
| Rendering | Mix of SSR (`force-dynamic` on home, market prices) and `generateStaticParams` on spice/country pages |
| API | TypeScript AWS Lambda + API Gateway (`apps/api`), SAM |
| Shared | `@spicycorner/shared` Zod schemas (package name leftover) |
| Database | DynamoDB multi-table on-demand |
| Auth | Cognito |
| Payments | Stripe + Razorpay; bulk add-ons Stripe (UK/EU only) |
| Email | SMTP (`mail.spicycenter.com`) for enquiries; SES for marketing |
| Files | S3 + CloudFront WebP variants |
| Analytics | Custom `/events` + GA4 + GTM + Ads + Meta + Clarity |
| Deploy | GitHub Actions + **Amplify** (web). Live `robots` Host = Amplify default app |
| CDN | CloudFront in front of Amplify (response headers on sitemap) |
| CMS | **None** — JSON files (`data/spices.json`, `data/products.json`) + Dynamo products |
| i18n | 30 client locales; **no** locale-prefixed crawlable URLs |
| Images | Next/Image + CDN; stock/mapped photography risk |

**Live vs repo:** `NEXT_PUBLIC_SITE_URL` is **not** set to `https://www.spicycenter.com` on the Amplify build that produced robots/sitemap. `getSiteUrl()` falls back to `https://${AWS_BRANCH}.${AWS_APP_ID}.amplifyapp.com`.

## 1.2 Repository history (19 Sep)

- Active branch: **`main`** tracking `origin/main` @ `c7f8800` (US/CA bulk destinations).
- Recent work: Agmarknet prices, bulk quotes, SEO storefront, UK/EU-only retail.
- Working tree: uncommitted mandi board pagination/filter; untracked `apps/web/.next/`, `code/`.
- AWS resource names still `spicycorner-*` in places.

## 1.3 Live website (completed checks)

| Check | Result |
|-------|--------|
| Homepage 200 | Yes — UK/EU positioning, 1410 products |
| `/uk`, `/wholesale`, `/bulk-enquiry`, `/products` | 200 |
| `/countries/usa`, `/markets/uae`, nested geo path | **404** |
| `/llms.txt` | 200, `X-Robots-Tag: all` |
| `robots.txt` | Disallows admin/cart/checkout/account/orders/wishlist; **allows** major AI bots |
| robots Host + Sitemap | **`https://main.dlvo7vcdxgylt.amplifyapp.com`** |
| sitemap.xml | **200**, ~**2,004** locs, all on Amplify hostname |
| Nested `/countries/…` in sitemap | **246**; sample URL 404 |
| `usa` in sitemap locs | **58** |
| Core Web Vitals | **Not measured** |
| Full broken-link crawl | **Not run** |

## Canonical / hreflang / metadata

- Helpers: `apps/web/src/lib/seo.ts` (`canonical`, `pageMetadata`, JSON-LD).
- Layout (current repo): `html lang="en-GB"`, OG locale `en_GB`, hreflang `en-GB` → `/uk`, `x-default` → `/`.
- 15 Sep audit still listed `en_US` OG and “Send to USA” H1 — **verify live `/products` H1** before assuming that is fixed in production (repo layout is already en-GB).

## Schema

Organization, WebSite, OnlineStore, LocalBusiness (UK + India), Product, FAQ, Breadcrumb, Article, Recipe.  
Risk: schema must match visible offers/currency. HowTo helper may still mention retired categories.

## Indexation risks (priority)

1. **Wrong sitemap/robots host** — Google may treat Amplify as canonical site.
2. **~300 geo URLs in sitemap that 404** — crawl-budget waste; possible soft-404 indexing.
3. Duplicate UK hubs.
4. Single 2k-URL sitemap (acceptable size; host is the problem).
5. Query listing URLs: code noindexes `?search=` / filters on `/products` and `/spices`; robots does not disallow query strings.

## Performance (code, unmeasured live)

Existing pipeline: responsive WebP, CloudFront. Next.js bundle + third-party tags (GTM, GA4, Ads, Pixel, Clarity) are the likely JS cost. **Do not promise a PageSpeed score.**

## Security / privacy (brief)

- Do not expose lead PII on public confirm URLs beyond enquiry ID.
- Analytics must not store unnecessary PII.
- Secrets stay in Amplify/SAM; this audit did not print credentials.
