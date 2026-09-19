# Traffic baseline

**Date:** 19 September 2026  
**Property:** https://www.spicycenter.com/

## Access status

| Source | Available this audit? | Notes |
|--------|------------------------|-------|
| Live HTTP fetch of homepage, /uk, /wholesale, /bulk-enquiry, /products, robots, sitemap | **Yes** | See technical-findings.md |
| Google Search Console (clicks, impressions, queries, countries) | **No** | Verification meta exists (`google-site-verification` in `apps/web/src/lib/analytics-config.ts`). No API/export was provided. |
| GA4 `G-PGFC0DCL1C` | **No** | Tag is hardcoded on the storefront. No property export in repo. |
| GTM `GTM-KQLBTVVK` | Tag present | Container contents not inspected |
| Google Ads `AW-18198485613` | Tag present | Conversion fires on **purchase**, not enquiry |
| Meta Pixel `1459099935879507` | Tag present | Campaigns unknown |
| Microsoft Clarity `xdpv6v2lq9` | Tag present | No export |
| Admin Dynamo visitor analytics | **No live rows** | KPI code audited; see 15 Sep `traffic-analysis.md` |
| Bing Webmaster | Verification string **empty** | |

**Do not treat any single admin “daily users” snapshot as organic Google demand.** The 15 Sep audit documented that admin country is **session + IP/header/timezone inference**, with a historic **default-US** bias.

## Instrumented events (code)

Custom `POST /events` via `TrackingProvider` / `track.ts`:

- page_view, product_view, cart_add/remove, checkout_start, purchase, search, session_ping

**Missing or incomplete for B2B growth:**

- Enquiry form view / start / submit / validation error
- Bulk enquiry attribution (UTM, landing page) on the enquiry record
- Country × source × landing page in admin
- Add-on view/select (except Stripe payment on UK/EU add-ons)

## Baseline we can state without GSC

| Item | Evidence | Value |
|------|----------|--------|
| Storefront claim | Live home | “UK & EU Delivery”, 1,410 SKUs |
| Indexable catalog size (intended) | `data/products.json` | ~1,410 product URLs |
| Knowledge entities | `data/spices.json` | 88 |
| Live sitemap loc count | GET sitemap.xml 19 Sep 2026 | **2,004** `<loc>` |
| Sitemap host | Same file | **`https://main.dlvo7vcdxgylt.amplifyapp.com`** — not the public domain |
| Reported daily users (business) | Owner brief | ~800/day claimed; **unverified here** |
| 15-day 5,000 users target | Owner brief | **Not guaranteed**; organic SEO alone cannot commit to this |

## How to complete the baseline (operators, Day 1–2)

1. Open GSC for `https://www.spicycenter.com/` (and `https://spicycenter.com/` if a separate property).
2. Export last 28 days vs previous 28 days: countries, pages, queries, devices.
3. Open GA4: Users, Sessions, Organic Search, country, landing page, conversions.
4. Define **enquiry** as a GA4 conversion (wholesale + bulk + contact).
5. Re-export admin visitor pie **after** geo default is Unknown (if A2 from `implementation-plan.md` is approved).

Until those exports exist, country and landing-page files below are **signal audits**, not ranked GSC tables.

## Comparison periods

Cannot be produced from git. Placeholder for when GSC/GA4 CSVs are attached:

| Period | Users | Organic | USA organic | UK/EU organic | ME organic | Enquiries |
|--------|-------|---------|-------------|---------------|------------|-----------|
| Last 28 days | TBD | TBD | TBD | TBD | TBD | TBD |
| Prior 28 days | TBD | TBD | TBD | TBD | TBD | TBD |
