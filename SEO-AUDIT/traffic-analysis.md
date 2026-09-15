# SpicyCenter traffic + SEO audit

**Site:** https://www.spicycenter.com/  
**Repo:** spicycenter.com (Next.js 15 App Router + Lambda API)  
**Date:** 15 September 2026  
**Constraint:** Do not block, reduce, redirect, or remove USA traffic. This document is an audit only. No storefront changes were made.

**Limitation:** This audit is from **repository evidence**. It cannot see Google Search Console queries, GA4 acquisition reports, or live DynamoDB session rows. Admin “USA ~53 of ~73 visitors” must be interpreted through the **code that produces those KPIs**, not as proven organic Google demand.

---

## 1. Executive summary

SpicyCenter is a **UK/EU-declared** Indian-spice storefront on a **`.com`** domain, built from a **US-oriented ecommerce clone**. Visitor “country” in admin is **not Google Analytics**. It is **unique browser sessions** with country from **CDN/IP headers**, and if those are missing, **timezone/locale inference that maps any `America/*` timezone and `en-US` locale to US**, and **`detectViewerGeo()` defaults to `US`**.

That means a USA-heavy pie shortly after launch can be:

1. **Real humans in the United States** (possible: generic English `.com`, leftover “USA” titles, Merchant feed `g:country>US`, Google Ads / Meta tags).
2. **Inflated US labels** (geo default US; `America/*` → US; unknown locale `en-US` on many browsers).
3. **Non-customer sessions** that still pass the weak bot filter (empty UA is **not** dropped; AI crawlers allowed in `robots.ts` may still count if UA does not match `bot|crawler|spider|…`).
4. **Not yet explainable as “Google organic USA”** — first-touch UTM/source is stored on events but **not shown** on the visitor-by-country dashboard.

**Keep USA traffic.** The gap is not “too much USA.” It is **UK/EU signals weaker or newer**, **legacy US metadata still indexed**, and **analytics that cannot answer why a session arrived**.

---

## 2. Current website architecture

| Layer | Evidence |
|-------|----------|
| Storefront | Next.js 15 App Router, `apps/web` |
| Rendering | Mix of SSR (`force-dynamic` on home/products), SSG (`generateStaticParams` on spices/countries), client widgets |
| API | AWS Lambda + API Gateway (`apps/api`), DynamoDB events/customers/orders |
| Hosting | Amplify (web) + SAM (`spicycorner-prod` names) |
| Tracking | Custom `/events` + GA4 `G-PGFC0DCL1C` + GTM + Google Ads + Meta Pixel + Clarity |
| Search Console | Hardcoded `google-site-verification` in `analytics-config.ts` |
| Bing | Empty `bingSiteVerification` |

Public storefront routes (not admin/cart/checkout/account):

- Home/brand: `/` `/about` `/contact` `/faq` `/press` `/reviews` `/shipping` `/terms` `/privacy` `/returns`
- Legal: `/legal/food-information` `/legal/allergens` `/legal/shipping` `/legal/terms` `/legal/privacy` `/legal/returns`
- Catalog: `/spices` `/spices/[slug]` `/products` `/products/[slug]` `/categories/[slug]` `/bulk-spices` `/bulk-spices/[slug]`
- Knowledge: `/spice-guide` `/spice-guide/[slug]` `/spice-guide/compare/[slug]` `/spice-guide/comparisons/[slug]` `/recipes` `/recipes/[slug]` `/indian-spice-regions` `/indian-spice-regions/[slug]` `/spice-market-prices` `/spice-finder` `/blog` `/blog/[slug]`
- Markets: `/uk` `/uk/indian-spices-wholesale` `/eu` `/europe/indian-spices` `/countries/{uk,de,fr,es,it,nl,ie,be}` `/spice-supplier`
- Wholesale: `/wholesale` `/wholesale/{indian-spices,cumin,turmeric,black-pepper,coriander,chilli,cardamom,restaurants,hotels,caterers,food-manufacturers,grocery-retailers,importers,distributors,uk}`
- Machine: `/sitemap.xml` `/robots.ts` `/llms.txt` `/llms-full.txt` `/humans.txt` `/api/feed.xml`

Redirects (thin): `/uk/indian-spices` → `/spices`, `/uk/bulk-indian-spices` and `/europe/bulk-indian-spices` → `/spices?channel=bulk`. `/just` → `/`.

---

## 3. Current traffic implementation

### 3.1 Two different “analytics” systems

| System | What it is | What admin “visitors by country” uses |
|--------|------------|----------------------------------------|
| **Custom sessions** | `TrackingProvider` → `track.ts` → `POST /events` → DynamoDB | **Yes** (`getVisitorAnalytics`) |
| **GA4 / GTM / Ads / Pixel / Clarity** | Hardcoded IDs in `apps/web/src/lib/analytics-config.ts` | **No** — not wired to the admin pie |

### 3.2 KPI formulas (`apps/api/src/handlers/analytics.ts`)

Days are **IST (Asia/Kolkata)** buckets.

| KPI | Formula |
|-----|---------|
| **TOTAL VISITORS** | Count of distinct `sessionId` with ≥1 of: page_view, product_view, cart_add, cart_remove, checkout_start, purchase, search, session_ping |
| **COUNTRIES** | Count of distinct country buckets after inference (`Unknown` is a country) |
| **IDENTIFIED** | Session has name **or** email **or** phone (`isKnownContact`) |
| **PURCHASED** | Session has a `purchase` event |
| **Daily visitors** | Each session assigned to **one** IST day (`lastSeen` preferred) |
| **Visitors by country** | Each session → one ISO country via `inferViewerCountryCode` |

### 3.3 How country is assigned

1. Browser calls `GET /api/geo` (`detectViewerGeo` in `apps/web/src/lib/geo-currency.ts`).
2. Headers: `cloudfront-viewer-country`, `cf-ipcountry`, `x-vercel-ip-country`, etc.
3. Else public IP lookup (ipwho.is / ipapi.co).
4. **Else `country: "US"` with `source: "default"`.**
5. Events also merge API Gateway/CloudFront headers; **client geo wins**.
6. Admin pie: if stored country missing, timezone `America/*` or locale `en-us` → **US**. Other `Europe/*` (except London) is **not** guessed (becomes Unknown, not DE/FR).

### 3.4 Bot filtering

`looksLikeBot` in `apps/api/src/handlers/events.ts` drops events whose UA matches:

`bot|crawler|spider|headlesschrome|preview|slurp|facebookexternalhit`

**Not dropped:** empty UA; many AI crawlers unless the word “bot” appears; humans with “bot” in UA (rare).

`robots.ts` **explicitly allows** GPTBot, ClaudeBot, PerplexityBot, Bytespider, CCBot, Google-Extended, FacebookBot, etc. Those hits only become “visitors” if they execute JS `track()` **and** fail the UA regex.

### 3.5 What is stored vs what the dashboard shows

Stored on events (often unused in the country pie):

- `referrer` (`document.referrer`)
- `attrFirstSource`, `attrFirstMedium`, `attrFirstCampaign`
- `attrLastSource`, `attrLastMedium`, `attrLastCampaign`
- `path`, device, browser, timezone, locale

**Not aggregated by country** in `getVisitorAnalytics`. Overview “traffic source” uses **referrer hostname only**, globally, not sliced by US/UK.

Landing page exists in `localStorage` (`attribution-store.ts`) and on **orders**, not as a first-class visitor KPI.

**IP is not stored** on analytics events.

### 3.6 Classification of “73 visitors / majority USA”

Cannot be proven from code alone. Most likely mix:

| Hypothesis | Plausible? | Evidence |
|------------|------------|----------|
| Real US humans | Yes | CDN country header if CloudFront is present; `.com` + English |
| Inflated US via default | Yes | `detectViewerGeo` default `"US"` |
| Inflated US via timezone | Yes | `America/*` → US (includes much of Latin America except CA overrides) |
| Googlebot as visitors | Unlikely if UA contains `bot` | Filtered at ingest |
| ChatGPT/social preview | Mixed | `facebookexternalhit` filtered; GPTBot may or may not run JS |
| Direct / founder / Cursor | Possible | Referrer empty → “Direct” on overview |
| Google Ads / Meta | Possible if campaigns exist | Tags `AW-18198485613`, Meta Pixel, GTM are **in code**; campaign existence is **not** in repo |
| Organic Google US | Unknown | Need GSC; leftover US titles/feed could help US more than UK |

**Do not treat admin USA count as “53 US wholesale customers.”** Identified + Purchased KPIs exist to separate that.

---

## 4. Why USA may currently show more traffic

### 4.1 USA-related signals (classified)

| ID | Signal | Class | Why |
|----|--------|-------|-----|
| U1 | `detectViewerGeo()` defaults to US | **D + E** | Directly inflates US in analytics if headers/IP fail (Amplify local, some proxies) |
| U2 | `inferViewerCountryCode`: `America/*` and `en-us` → US | **D** | Browsers default `en-US`; many US/LatAm TZs labelled US |
| U3 | Open Graph `locale: "en_US"` on all pages | **A** | Strong language-region signal to Google/social |
| U4 | `<html lang="en">` not `en-GB` | **B** | Weak vs en_US OG, still not UK |
| U5 | `/products` H1 `Shop spices — Send to USA` | **A** | Indexed listing H1; commercial US intent |
| U6 | Terms/returns/press metadata “USA” delivery | **A** | Indexable legal/press titles |
| U7 | Merchant feed `<g:country>US</g:country>` USD shipping | **A** | Shopping/organic listings target US |
| U8 | `serviceAreaJsonLd` containedInPlace United States + USD | **A** | If any city URL is crawled |
| U9 | Sitemap `indexableGeoPaths()` including `/spices/usa/…` and US trees | **A/B** | Google may crawl **404s** or thin geo URLs |
| U10 | Orphan `country-pages.ts` slug `us` (not served; 404) | **B** | Data still in repo; not a live landing |
| U11 | Schema `currenciesAccepted` includes USD first in list | **B** | Organization/OnlineStore |
| U12 | Checkout/address default `country \|\| "US"` | **E** | Conversion/geo, weak SEO |
| U13 | Product/cart schema default currency USD | **E** | Not public copy |
| U14 | US warehouse San Jose in `markets.ts` | **E** | Business record; not a public /us page |
| U15 | Trust strip / emails “USA shipping / 50 states” | **B** | Residual clone copy |
| U16 | Google Ads + Meta Pixel + GTM | **D** | Can generate US paid/social if campaigns exist |
| U17 | Domain `spicycenter.com` | **A/F** | `.com` is globally US-associated in searcher behaviour; not a keyword |
| U18 | `robots.ts` allows US-heavy AI crawlers | **D** | Discoverability; visitor count only if JS events stored |
| U19 | Wholesale page **excludes** US fulfilment | **C** | Does not attract US SEO; may reduce US wholesale |

### 4.2 Known/likely sources (ranked by evidence strength)

1. **Analytics labelling bias (U1, U2)** — strongest *code* explanation for a USA-majority pie at tiny volume.
2. **Generic English `.com` + leftover US titles/H1/feed (U3, U5–U7)** — strongest *SEO* explanation if GSC later shows US impressions.
3. **Paid tags present (U16)** — only if Ads/Meta campaigns are on; not visible in git.
4. **Direct / tools / previews** — empty referrer; US CloudFront pops.
5. **Referral from ChatGPT/social** (live URL was shared with `utm_source=chatgpt.com` in prior work) — UTM captured in attribution store, **not** shown on country pie.

---

## 5. What is missing from analytics

To answer “Why did these 53 US visitors arrive?” the code **almost has the data** (`attrFirstSource`, referrer, `path`) but **does not expose**:

- Country × first-touch source/medium/campaign
- Country × landing path (first `page_view`)
- Country × bot vs human (post-hoc)
- Distinction: CDN country vs inferred vs default-US
- Click IDs (`gclid`, `fbclid`) persisted
- Admin-path exclusion from visitor totals
- GSC/GA4 import (separate products)

**Minimum safe add (do not implement until approved):** when merging sessions, copy first event’s `attrFirstSource`, `attrFirstMedium`, `referrer`, first `path`; add `geoSource` (`header`/`ip`/`default`/`inferred`); filter `path` starting `/admin`. Preserve existing session IDs and KPIs.

---

## 6. UK vs Europe vs USA signals

### USA currently “has”

Legacy **titles, OG locale, Merchant US, sitemap US geo, default geo US, USD schema on city template**, warehouse + checkout defaults.

USA **does not** have a live `/us` hub or selectable US delivery market (`isStorefrontDeliveryCountry` is EU-only). Do **not** interpret that as “block USA.” It means **US shoppers can still land and browse**; checkout/quotes are UK/EU-oriented.

### UK currently has

| Asset | URL |
|-------|-----|
| Primary hub | `/uk` |
| Wholesale UK | `/uk/indian-spices-wholesale`, `/wholesale/uk` |
| Country page | `/countries/uk` (risk: **duplicate** of `/uk`) |
| Shipping copy | ₹750/kg UK rule on legal/home |
| GBP default | `currency-context.tsx` |
| Keyword cluster | `keyword-clusters.ts` weighted to wholesale UK |
| Blog | `/blog/buy-indian-spices-in-bulk-uk` |

**UK lacks relative to a mature UK spice supplier:** dedicated `/uk/indian-spice-supplier` (exists globally as `/spice-supplier`), city pages (London/Birmingham), product pages with “UK delivery” in unique titles (many SKUs share generic names), GB Merchant feed, `en-GB` html/OG, payment region GB, hreflang on `/uk`.

### Germany / France / Netherlands / Ireland

Live English pages: `/countries/de|fr|nl|ie`. Copy quality was partially cleaned (FR/IT/ES). **hreflang collision:** several EU pages use `en-GB`, so alternates map overwrites. No German/French language versions (correct until real localization). No `/wholesale/germany` URL (cluster maps many EU keywords onto `/wholesale`). AT/PT/SE/DK/FI/PL/CZ listed as served in `EUROPEAN_COUNTRY_CODES` but **no country landing**.

### Comparison punchlines

- **USA has stronger leftover on-page/geo/feed signals than the UK has in Google Shopping.**
- **UK has stronger intentional hubs (`/uk`, wholesale) than USA has live landings — but global chrome still says `en_US` / Send to USA.**
- **Europe has 8 country URLs; USA has a 50-state geo catalog in sitemap that UK cities do not have as live pages.**
- **Analytics infers US aggressively and Europe poorly** (no guess for `Europe/Berlin` → DE). That **under-counts Germany/France** vs USA on the same dashboard.

---

## 7. UK SEO strategy (architecture-fit, no new thin URLs yet)

**Keep and strengthen existing:**

| Intent | Canonical URL |
|--------|-----------------|
| Indian spices UK | `/uk` |
| Wholesale / supplier UK | `/wholesale/uk` + `/spice-supplier` + `/uk/indian-spices-wholesale` |
| Bulk | `/wholesale` + `/bulk-spices` (avoid extra `/uk/bulk-*` if it only redirects) |
| Product | `/products/{slug}` and `/spices/{spice}` — add UK in **metadata only** where true |
| Knowledge | `/spice-guide/{spice}` |

**Do not auto-create** `/uk/indian-spices/`, `/uk/indian-spice-exporter/` until `/uk` is canonical and `/countries/uk` is either merged or 301’d.

**Product-level UK:** one strong page per spice (guide + shop + wholesale) covering “turmeric wholesale UK / bulk turmeric UK” via sections and internal links — not 20 URLs.

---

## 8. Europe SEO strategy

English-first is appropriate (`country-pages` are English). **Do not add hreflang `de-DE` until a German URL exists.** Fix duplicate `en-GB` tags first.

Priority live pages: DE, FR, NL, IE (already exist). Next **only if fulfilment is real:** BE (exists), then AT/PT/SE/DK/FI/PL/CZ as **quality** pages like FR cleanup — not 100 city clones.

No translated site until support language is real.

---

## 9. Content gaps

| Opportunity | Intent | Country | Existing URL | New URL? | Priority |
|-------------|--------|---------|--------------|----------|----------|
| UK spice labelling / food info | Informational + trust | GB | `/legal/food-information` | No — expand | HIGH |
| Import India→UK narrative | Informational | GB | `/uk`, `/indian-spice-regions` | Maybe later `/uk/sourcing` | MEDIUM |
| Restaurant/manufacturer | Commercial | GB/EU | `/wholesale/restaurants` etc. | No | HIGH |
| Certificates/testing | Commercial | GB/EU | Missing honest “we do not invent certs” | Only if true | LOW |
| Private label | Commercial | EU | Missing | Only if offered | LOW |
| DE/FR delivery+VAT FAQ | Commercial | DE/FR | `/countries/de`, `/fr` | No — deepen | HIGH |
| Whole vs ground | Informational | All | `/blog/whole-spices-vs-ground-spices` | No | MEDIUM |
| Grades | Informational | All | Guides partial | No mass pages | MEDIUM |

---

## 10. Internal linking

`getInternalLinkGroups` in `seo-internal-links.ts` connects home/listing/product/country/guide/blog. Issues:

- Comment still says “High-value US metros” while links are UK/EU.
- `/uk` vs `/countries/uk` competing hubs.
- Spice guide ↔ product ↔ wholesale links exist in newer hub helper (`spice-hub-links.ts`) — not universal on every SKU.
- City routes orphaned (empty location data).
- Geo sitemap URLs likely **orphans + 404s**.

---

## 11. Technical SEO problems

| Issue | Severity |
|-------|----------|
| Sitemap includes `indexableGeoPaths()` without matching pages | CRITICAL |
| Duplicate `/uk` and `/countries/uk` | HIGH |
| Hreflang map collisions (`en-GB` reused) | HIGH |
| OG locale `en_US` sitewide | HIGH |
| Products H1 Send to USA | HIGH |
| Feed.xml shipping US only + leftover “Decorations” title | HIGH |
| Legal terms/returns US copy vs UK shipping page | HIGH |
| `/products?sort=` etc. — listing query URLs; robots does not disallow filters | MEDIUM |
| City schema hardcodes United States | MEDIUM (pages empty today) |
| Bing verification empty | LOW |
| Product images are mapped stock photos (thin uniqueness) | MEDIUM for Shopping |
| `robots.ts` allows all AI crawlers | Intentional; LOW for rankings |

Crawlability of products: SSR product pages + sitemap product URLs — Google **can** index if 200. Catalog JSON is server-loaded.

---

## 12. Schema / metadata / country targeting

- Organization `areaServed` = UK + 7 EU (good).
- OnlineStore still lists USD among currencies (honest if USD selectable).
- Product JSON-LD exists in `seo.ts` / product pages — must match visible price/currency (GBP vs USD mismatch risk).
- FAQ schema on homepage (UK shipping ₹/kg) — good for UK, odd if US user.
- Country targeting: **no Search Console geo-target in code** (GSC setting is outside repo). Domain `.com` is not ccTLD `co.uk`.

---

## 13. AI / LLM discoverability

Present: `/llms.txt`, `/llms-full.txt`, spice guides, organization JSON-LD, UK/EU audience line.  
Harmful: llms-full still mentions USA city/state delivery; humans.txt “not US-only warehouse.”  
Do not add fake certifications.

---

## 14. Priority matrix

| ID | Problem | Evidence | Why it matters | Recommended fix (later) | Impact | Risk |
|----|---------|----------|----------------|-------------------------|--------|------|
| P1 | Cannot explain US sessions | Attribution unused in visitor API | Wrong strategy | Surface source×country; tag geoSource | High insight | Low if additive |
| P2 | US default + America TZ | `geo-currency.ts`, `viewer-geo.ts` | Inflates US vs EU | Default GB or Unknown; don’t map all America/* to US | Corrects pie | Must not hide real US |
| P3 | Sitemap 404 geo URLs | `sitemap.ts` + `geo/catalog.ts` | Crawl budget | Sitemap only real 200 URLs | High crawl | Low |
| P4 | US H1 / OG / feed | `products/page.tsx`, `seo.ts`, `feed.xml` | Ranks US more than UK | Align chrome to UK/EU **without** deleting US-accessible pages | High UK | Don’t geo-block US |
| P5 | Duplicate UK URLs | `/uk` vs `/countries/uk` | Dilution | One canonical | Medium | Redirect carefully |
| P6 | Hreflang collisions | `countries/[slug]/page.tsx` | Invalid international SEO | Unique tags or drop | Medium | Low |
| P7 | EU under-inferred | `Europe/*` → Unknown | Dashboard looks US-heavy | Infer DE/FR/NL from TZ | Insight | Don’t over-guess |
| P8 | Thin country/EU pages | AT/PL etc. missing | Gaps | Quality pages only if shipped | Medium | Doorway risk |
| P9 | Legal US vs UK | terms/returns vs legal/shipping | Trust + rankings | Rewrite legal to actual markets; keep US visitors allowed | Medium | Legal review |
| P10 | Shopping feed US-only | `feed.xml` | US Shopping | Add GB/EU destinations **in addition** | High EU Shopping | Feed policy |

---

## 15. Page sample (Phase 5)

| PAGE | CURRENT TITLE (intent) | H1 / issue | TARGET | COUNTRY | PROBLEM | RECOMMENDATION |
|------|------------------------|------------|--------|---------|---------|----------------|
| `/` | Indian spices retail & bulk | UK/EU body | Commercial+info | GB/EU | OG en_US | Set OG en_GB; keep indexing US users |
| `/products` | Shop Indian spices | **Send to USA** | Transactional | GB | US H1 | Change H1 to spices UK/EU; do not noindex |
| `/uk` | Indian spices UK | UK hub | Commercial | GB | Duplicate `/countries/uk` | Canonical cluster |
| `/wholesale/uk` | Wholesale UK | B2B | Enquiry | GB | Thin vs `/uk` overlap | Differentiate MOQ/B2B |
| `/countries/de` | Indian spices Germany | English | Enquiry | DE | en-GB hreflang | Keep English; unique hreflang |
| `/spice-guide/cumin` | Guide | Informational | AI+organic | All | Link to UK wholesale | Keep |
| `/terms` | Terms | USA delivery meta | Trust | Conflict | US legal vs UK ops | Align copy |
| `/api/feed.xml` | Merchant | US shipping | Shopping | US | No GB | Add GB/EU shipping nodes |
| `/spices/usa/…` | Sitemap only | — | — | US | Likely 404 | Remove from sitemap |

---

*End of audit. No application code was changed for this document.*
