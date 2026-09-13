# SpicyCorner global SEO architecture

**Status:** Location tree implemented at `/spices/{country}/{region}/{city}`. Existing `/countries/` and `/cities/` URLs are kept (no 301 yet). City pages are only those named in the geographic brief — not every municipality. Australia “Other Territories” are generated but `noindex`. Live freight quotes remain US, CA, GB, AU, DE only.  
**Site:** https://www.spicycenter.com/  
**Catalog:** CJ Dropshipping spice SKUs stored in Dynamo (`cjPid` / `cjVid`), storefront API `/cj/products`.  
**Principle:** 20,000+ keyword *targets*, not 20,000 indexable URLs. One strong page owns a cluster. Location pages use Country → administrative region → city with the correct local unit name (state, UT, province, prefecture, emirate, constituent country, district, Land).

---

## 1. Current architecture audit

### What exists today (keep)

| Surface | URLs | Count (approx.) | Notes |
|---------|------|-----------------|--------|
| Home | `/` | 1 | SSR, FAQ + HowTo JSON-LD, category rails |
| Catalog | `/products`, `/products?search=`, `/products?category=` | 1 + query variants | Query URLs are indexable today (risk) |
| Product PDP | `/products/{slug}` | live CJ SKUs | Canonical, Product JSON-LD, videos, shipping panel |
| Categories | `/categories/{slug}` | 8 | Unique titles/H1 from `seo-data` + rich copy |
| Countries | `/countries/{slug}` | 13 | US, UK, CA, AU, IN, AE, DE, FR, ES, IT, NL, IE, BE |
| Cities/states | `/cities/{slug}` | 31 | Mix of US cities **and** states in one path |
| spice location tree | `/spices/`, `/spices/{country}/…` | ~300 | Country → admin region → named city. Hub + geo catalog in `apps/web/src/lib/content/geo/` |
| Guide | `/spice-guide`, `/spice-guide/events` | 2 | Strong hub; USA-centric copy |
| Blog | `/blog`, `/blog/{slug}` | ~40 | Handwritten + generated SEO posts |
| Utility | `/shipping`, `/faq`, `/about`, `/reviews`, `/llms.txt` | several | Keep |
| Legacy 301s | `/shop`, `/product/:slug`, WP paths | many | `legacy-urls.ts` — keep |

**Routing:** Next.js App Router. Location SEO now has a hierarchical tree at `/spices/{country}/{region}/{city}` in addition to the older flat `/countries/{slug}` and `/cities/{slug}` URLs.

**Product model (normalized already, keep extending):** Dynamo `PRODUCT#{slug}` with `name`, `description`, `images`, `videos`, `price`, `compareAtPrice`, `currency`, `categorySlug`, `sku`, `inventory`, `cjPid`, `cjVid`, `cjVariants[]`, `weightOz`, dims, `availableCountryCodes?`, `seoTitle`, `seoDescription`. Vendor cost stripped on public APIs.

**Categories (store slugs):**

- `whole-spices`
- `ground-spices`
- `indian-chillies`
- `indian-masalas`
- `seeds`
- `herbs`
- `premium-spices`
- `bulk-spices`

CJ category names are mapped onto these via `mapCjCategoryToStoreSlug`. Variety, form and pack size are product attributes, not extra category URLs.

**SEO implementation (keep helpers):**

- `canonical()`, `pageMetadata()`, `productPageMetadata()` in `apps/web/src/lib/seo.ts`
- JSON-LD: Organization, WebSite, OnlineStore, Product, Offer, BreadcrumbList, FAQPage, VideoObject, ItemList (categories)
- Keyword JSON: `seo-keywords.data.json` (large cluster lists), location JSON, category primary titles
- `robots.ts`: allow `/`, disallow admin/cart/checkout/account/orders; sitemap pointed
- Single `sitemap.ts` (not split)

**CJ integration (keep, do not bypass):**

- Import + async jobs (`/admin/cj/imports`)
- PDP freight: `GET /cj/products/{slug}/shipping?country=` for **US, CA, GB, AU, DE only**
- Checkout shipping is **store policy** (free at $49+; stepped fees below that), not CJ postage
- Freight is **quoted live + cached 6h per vid/country**, not a 200-country matrix

**Markets (keep as checkout/display layer):** Dynamo markets (locale, currency, hreflang). Default warehouses still describe San Jose / Southampton / India — leftover from the previous fulfillment story. **CJ products ship from China.** Country landing copy that promises a US warehouse is now a factual risk.

### Problems (do not ignore)

1. **Fulfillment copy vs CJ reality.** Home, guide, city, and some country pages still say “fast USA delivery”, “San Jose warehouse”, “all 50 states”, “order by Oct 25”. CJ transit is typically many days from China. Never index new location pages with those claims.
2. **No per-product × destination availability at rest.** CJ `freightCalculate` is 1 QPS. We cannot probe 6,000 × 200 countries. Country support must be **sampled and cached**, never assumed.
3. **Thin programmatic risk already in keywords.** `seo-keywords.data.json` contains many near-duplicate modifiers (“for apartments”, “for renters”, “you can do this weekend”). Those are **clusters to attach to existing pages**, not new URLs.
4. **Cities and states share `/cities/`.** California and Los Angeles are siblings. That blocks a clean Country → Region → City tree and weakens breadcrumbs.
5. **Search/filter URLs can index.** `/products?search=` and `/products?category=` get metadata and are not noindexed.
6. **One sitemap file.** Fine at ~100 URLs; not fine at tens of thousands.
7. **Product titles/descriptions** often still CJ-raw. `seoTitle` exists but is not systematically rewritten.
8. **Organization `areaServed` is United States only** while hreflang already lists UK/CA/AU/IN/AE.
9. **No page quality score, noindex policy, or SEO admin.**
10. **Non-spice keyword clusters** (event tickets, attractions) are not products we sell — high cannibalization / mismatch risk if turned into shop pages.

### Retain vs replace

| Keep | Change later (controlled) | Do not do |
|------|---------------------------|-----------|
| `/products/{slug}`, `/categories/{slug}` | Add `/spices/` hub that *links* existing categories | Mass 301 of all category URLs |
| `/spice-guide` | Grow child guides under `/spice-guide/…` | Duplicate as `/what-is-spice/` without canonical |
| `/countries/*`, `/cities/*` | New `/spices/{country}/…` only after quality + 301 plan | Delete old location URLs |
| Canonical helper, JSON-LD, robots disallow of private paths | Split sitemaps; noindex search/facet queries | Index every city × category |
| CJ pid/vid, freight quote API | Background shipping matrix for Tier-1 countries | Live CJ call on every SEO render |
| Keyword JSON as *cluster input* | Attach clusters to pages; prune doorway variants | One URL per keyword string |

---

## 2. Proposed data model

Fit the existing **multi-table Dynamo** design. New table: `spicycorner-seo-{env}`.

```
LOCATION#{geoId}          SK META          country | admin_region | city
SEO_PAGE#{pageId}         SK META          type, path, score, index, overrides
KEYWORD#{kwId}            SK META          cluster, pageId, intent
SHIP_SAMPLE#{cjPid}#{CC}  SK META          available, methods[], sampledAt
TAXONOMY#{slug}           SK META          parent, audience, theme flags
```

**LOCATION**  
`geoId`, `kind` (`country` \| `admin_region` \| `city`), `isoCountry`, `adminCode`, `name`, `slug`, `parentGeoId`, `labelKind` (state/province/emirate/prefecture/region — **never force “state”**), `priority` (high/medium/low/disabled), `populationBand`, `activeForSeo`.

**SEO_PAGE**  
`pageType`, `path`, `canonicalPath`, `indexMode` (`index` \| `noindex` \| `disabled`), `score`, `scoreBreakdown`, `title` / `h1` / `description` (generated + optional admin override), `introOverride`, `faqOverride`, `productCountAvailable`, `lastSeoUpdate`.

**KEYWORD**  
`phrase`, `clusterId`, `pageId` (many keywords → one page), `intent`, `country?`, `geoId?`, `taxonomySlug?`.

**SHIP_SAMPLE**  
Written by a background job: for each imported `cjPid` + Tier-1 country, one cached `freightCalculate` (or “unsupported”). SEO and `isProductAvailableForCountry()` read **only this**, never live CJ on SSR.

**Product (existing)**  
Add optional `seoName` (clean title), `seoDescription` (rewritten), `taxonomySlugs[]` (audience/theme), keep `cjPid`.

Relationships:

```
Product --cjPid--> SHIP_SAMPLE --country--> LOCATION(country)
LOCATION(city) --> LOCATION(admin_region) --> LOCATION(country)
KEYWORD *--1 SEO_PAGE
SEO_PAGE --> LOCATION? + TAXONOMY?
```

---

## 3. URL architecture

**Do not migrate live URLs in the first build.** Add the hub; 301 later when new pages outrank.

| Type | Path | Index default |
|------|------|----------------|
| Hub | `/spices/` | index (can 200-alias `/spice-guide` later) |
| Category (existing) | `/categories/{slug}` | index |
| Strategic facet | `/spices/spices/kids/` etc. | only if score ≥ 80 |
| Country (new) | `/spices/{country}/` | score-gated; 301 from `/countries/{old}` when ready |
| Admin region | `/spices/{country}/{region}/` | score-gated |
| City | `/spices/{country}/{city}/` | score-gated |
| Location + category | `/spices/{country}/{city}/{category}/` | score-gated |
| Product | `/products/{slug}` | index |
| Guide | `/spice-guide/{topic}/` | index if unique |
| Events hub | `/spice-guide/events` | index; **no fake local event lists** |
| Search/filter | `/products?…` | **noindex, follow** |

Country slugs: `usa`, `uk`, `canada`, `australia` (readable). Map ISO `US`/`GB`/`CA`/`AU` in LOCATION.

Preserve `/cities/new-york` until `/spices/usa/new-york` is live + 301.

---

## 4. SEO page types

`PAGE_TYPE_HUB` · `CATEGORY` · `PRODUCT` · `COUNTRY` · `ADMIN_REGION` · `CITY` · `LOCATION_CATEGORY` · `GUIDE` · `EVENT_HUB` · `THEME` · `AUDIENCE`

Each type has: template set, min product count, required content blocks, sitemap bucket.

---

## 5. Keyword matrix (clusters, not URLs)

Dimensions (controlled): core × audience × theme × product-type × occasion × **Tier-1 location only**.

**One page, many keywords example**

Page `/spices/whole-spices` owns: “whole cumin”, “jeera seeds”, “buy whole Indian spices”.

Page `/spices` owns: “Indian spices UK”, “bulk Indian spices”, “spice wholesale”.

**Do not generate URLs for:** every “for apartments / renters / seniors / this weekend” modifier; ticket/attraction keywords we cannot fulfill; color+size+price facets.

---

## 6. Country / location architecture

Seed from a real gazetteer (ISO 3166 + GeoNames/Natural Earth), not invented cities.

Activation:

1. `supported_by_cj_sample` — at least N products have a successful freight sample to that ISO code.
2. `active_for_spicycorner` — admin flag.
3. `priority_high` — US, UK, CA, AU, AE + major cities (NYC, LA, London, Toronto, Sydney, Dubai, …).

City page only if **priority_high/medium** AND (search demand band OR population band) AND `productCountAvailable ≥ threshold` AND shipping sample OK.

---

## 7. CJ shipping architecture

**Known CJ fields we already use:** pid, vid, sku, nameEn, description, images, videos, variants, sell price, inventory, packing weight/dims, category names, `freightCalculate` (method name, price, aging).

**Not available as a bulk “ships to 200 countries” feed.** Destination support is per quote. Missing: guaranteed country list, warehouse-level SEO claims, “fast USA” SLA.

**Functions (read cache only):**

- `isProductAvailableForCountry(product, cc)`
- `getAvailableProductsForCountry(cc, taxonomy?)`
- `getShippingOptions(product, cc)` → cached methods or `unknown`
- `getEstimatedDelivery(product, cc)` → aging label or omit
- `getCountryShippingStatus(cc)` → `{ sampledSkus, availableSkus, lastSync }`

**Sync job:** nightly, rate-limited. Tier-1 countries × imported pids (one default vid). Write `SHIP_SAMPLE`. Never block SSR.

**Checkout** stays store shipping policy; SEO copy must say “international dropship from China; quote shown on the product page” — not warehouse fiction.

---

## 8. Quality scoring

Configurable weights (defaults):

| Factor | Weight | Source |
|--------|--------|--------|
| Search demand | 30% | cluster size + manual priority (no invented volume) |
| Product inventory | 20% | in-stock SKUs in taxonomy |
| Shipping availability | 20% | `SHIP_SAMPLE` for that country |
| Content value | 15% | unique blocks (traditions, FAQs, not name-swap) |
| Commercial intent | 10% | transactional cluster |
| Uniqueness | 5% | token overlap vs sibling pages |

- **80–100:** index  
- **60–79:** generate, monitor, default noindex until review  
- **40–59:** generate + noindex  
- **&lt;40:** do not generate  

Hard veto: 0 products, 0 shipping samples, or uniqueness below threshold → do not generate.

---

## 9. Internal linking

Priority: Home → `/spices/` / guide → categories → high-value countries → high-value cities → location+category → products → related guides.

Rules: contextual links in copy; related-location block (siblings, not 200 cities); products get 2–4 location links **only** for countries with a positive ship sample; vary anchors; no exact-match spam.

---

## 10. Sitemap strategy

When URL count grows:

- `/sitemap.xml` index  
- `/sitemap-products.xml`  
- `/sitemap-categories.xml`  
- `/sitemap-locations.xml` (indexable location pages only)  
- `/sitemap-guides.xml`  
- `/sitemap-blog.xml`  

Omit noindex, disabled, search/facet, and non-canonical URLs. Cap ~50k URLs per file.

---

## 11. Index / noindex / canonical

- Canonical = path without query.  
- `/products?search=` and `/products?category=` → `noindex, follow`, canonical `/products` or `/categories/{slug}`.  
- Pagination: `rel=prev/next` or noindex page 2+ if thin.  
- Duplicate product URLs: existing 301s stay.  
- New `/spices/…` pages: canonical self; old `/cities/` 301 only after the new page is indexable.  
- hreflang: only for **translated or market-equivalent** pages we actually maintain — do not hreflang 13 country pages to the homepage as `x-default` without a clear policy (today layout already does this; tighten in Phase 6).

---

## 12. Implementation roadmap

| Phase | Work | Status |
|-------|------|--------|
| **1** | Audit (this doc). Correct warehouse/speed claims on high-traffic templates. | Done (2026-09-03): home, shipping, country/city, trust strip, product FAQs, chat. Category-rich copy still has leftover SLA language. |
| **1b** | noindex product search/filter query URLs (`noindex, follow`, canonical to `/products` or `/categories/{slug}`). | Done |
| **1c** | Contextual internal linking engine on existing URLs (not a new location tree). | Done: `getInternalLinkGroups()` on home, listing, category, product, country, city, guide, events, blog, shipping, footer. |
| **2** | SEO table + LOCATION seed (Tier-1 only) + `SHIP_SAMPLE` job for US/GB/CA/AU/DE | Next |
| **3** | Quality scorer + `SEO_PAGE` records; no public URL flood | — |
| **4** | `/spices/` hub + 3–5 country pages that reuse real product counts + cached freight | — |
| **5** | Content blocks; clean `seoName` on import | — |
| **6** | Split sitemaps + admin SEO flags | — |
| **7** | Tests: duplicate paths, sitemap, robots, score vetoes, broken links | Partial (link graph + shipping availability unit tests) |

No new city factory in this increment. Remaining category-rich and blog copy still mentions old USA warehouse SLAs and should be cleaned in a follow-up.

---

## 13. Risks

- Indexing location pages that promise US-warehouse speed.  
- CJ 1 QPS → incomplete country matrix; must show “availability checked for sampled destinations”.  
- Keyword JSON doorway patterns if turned into pages.  
- Attraction/ticket keywords vs ecommerce.  
- `/cities/{state}` vs `/cities/{city}` confusion.  
- hreflang without true language variants.  
- Generating `/spices/{country}/{city}/{category}` before product counts exist.

---

## 14. Expected scalability

- 6,000 products: already list/PDP; add `seoName` at import; sitemap split.  
- Locations: store thousands, **index tens to low hundreds** in Tier 1–2.  
- Keywords: tens of thousands of rows pointing at ~hundreds of pages.  
- SSR: precomputed `SEO_PAGE` + product list from Dynamo/API cache; **zero CJ HTTP on GET**.  
- Worker Lambdas (same pattern as CJ import 15-min) for ship samples and score refresh.

---

## 15. Files that will need changes (when implementing)

| Area | Files |
|------|--------|
| Shared schema | `packages/shared/src/schemas/product.ts`, new `seo.ts` / `geo.ts`, `packages/shared/src/db/keys.ts` |
| API | new handlers `seo/` + `cj-shipping-sample.ts`; `infrastructure/template.yaml` worker; `apps/api/src/router.ts` |
| Storefront | `apps/web/src/app/sitemap.ts`, `robots.ts`, `products/page.tsx` (noindex queries), new `app/spices/…` later |
| Copy | `apps/web/src/lib/site.ts`, `spice-guide/page.tsx`, `country-pages.ts`, `city-pages.ts`, home banners |
| Import | `apps/api/src/lib/cj-import.ts` (`seoName` rewriter) |
| Admin | `apps/web/src/app/admin/` SEO panel (Phase 6) |
| Docs | this file |

**Do not destroy:** existing `/products`, `/categories`, `/blog`, `/spice-guide`, `/cities`, `/countries` until a migration checklist is executed.

---

## CJ field map (for SEO, not raw dump)

| CJ | Internal | SEO use |
|----|----------|---------|
| pid | `cjPid` | identity, ship sample key |
| vid | `cjVid` / variants | freight quote |
| productNameEn | `name` + generated `seoName` | H1/title never raw dump |
| description HTML | stripped `description` + `seoDescription` | unique copy |
| images / videos | `images`, `videos` | Product + VideoObject |
| sellPrice | `vendorCost` → marked-up `price` | Offer |
| inventory | `inventory` | availability |
| category names | `categorySlug` + future `taxonomySlugs` | landing pages |
| logisticName/Price/Aging | cached ship sample | delivery copy only if sampled |
| warehouse (CJ) | not stored as HR warehouse | **do not claim local warehouse** |
