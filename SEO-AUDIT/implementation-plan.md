# SpicyCenter implementation plan (approval required)

**Do not execute until the owner approves.**  
**Never:** geo-block USA, 301 USA users away, delete USA-accessible URLs solely to “reduce US traffic,” doorway city farms, fake reviews/certs/warehouses, checkout/auth/admin rewrites.

Goal: **keep USA traffic** + **measure why it exists** + **add genuine UK/EU signals**.

---

## PHASE 1 — Analytics visibility

| Task ID | Task | Files (expected) | Expected result | Priority | Dependencies |
|---------|------|------------------|-----------------|----------|--------------|
| A1 | Persist `geoSource` (`header` / `ip` / `default`) on events | `apps/web/src/lib/track.ts`, `apps/web/src/app/api/geo/route.ts`, `apps/api/src/handlers/events.ts` | Admin can see how many “US” rows are default vs CDN | CRITICAL | None |
| A2 | Change geo **default** from `US` to `Unknown` (not GB) | `apps/web/src/lib/geo-currency.ts` | Stops silent US inflation; real US IPs still US via CloudFront | CRITICAL | A1 |
| A3 | Narrow TZ inference: do not map all `America/*` to US; keep US for US TZs only | `packages/shared/src/lib/viewer-geo.ts` | Fewer false US; LatAm not labelled US | HIGH | A1 |
| A4 | Infer DE/FR/NL/IE from common timezones/locales (conservative) | `viewer-geo.ts` | Europe appears on pie when CDN header missing | HIGH | A3 |
| A5 | Merge first-touch `attrFirstSource/Medium/Campaign`, first `path`, `referrer` into session summary | `apps/api/src/handlers/analytics.ts` | Answer “US → Google → /uk” | CRITICAL | None |
| A6 | Admin: country × source table + landing path | `VisitorAnalyticsPanel.tsx` | Dashboard answers acquisition | CRITICAL | A5 |
| A7 | Exclude `/admin` sessions from visitor KPIs (optional flag) | `analytics.ts`, `TrackingProvider.tsx` | Launch noise down | MEDIUM | A5 |
| A8 | Document that GA4 (`G-PGFC0DCL1C`) is the place for Ads/organic until GSC is linked | `SEO-AUDIT` only | Operators use both systems | LOW | GSC access (off-repo) |

Preserve existing `totalVisitors` definition unless A7 is explicitly accepted (changing it will change “73”).

---

## PHASE 2 — Technical SEO

| Task ID | Task | Files | Expected result | Priority | Dependencies |
|---------|------|-------|-----------------|----------|--------------|
| T1 | Sitemap: emit only URLs that 200 | `apps/web/src/app/sitemap.ts`, stop `indexableGeoPaths()` or gate on real routes | Crawl budget on real spices/UK/EU | CRITICAL | None |
| T2 | Pick canonical UK URL; 301 the duplicate | `/uk` vs `/countries/uk` | One UK hub | HIGH | Content owner choice |
| T3 | Fix hreflang uniqueness; English-only = `en-GB` + `x-default` without collisions | `countries/[slug]/page.tsx`, `country-pages.ts` | Valid international annotations | HIGH | T2 |
| T4 | Sitewide OG locale `en_GB` (does **not** block US users) | `layout.tsx`, `seo.ts` | Aligns with UK market | HIGH | None |
| T5 | `<html lang="en-GB">` | `layout.tsx` | Same | MEDIUM | T4 |
| T6 | Products index H1/title without “Send to USA”; keep page indexable | `products/page.tsx` | Removes strongest leftover US commercial H1 | HIGH | None |
| T7 | Merchant feed: add GB (and EU where true) **in addition to** US — do not delete US node | `feed.xml/route.ts` | Shopping visibility UK/EU **and** US | HIGH | Accurate shipping price |
| T8 | robots: consider disallowing `?*sort=` `?*filter=` if those URLs index | `robots.ts` | Less duplicate | MEDIUM | Confirm no needed landings |
| T9 | City JSON-LD: do not emit US Service schema until city pages are real UK/EU cities | `seo.ts` | No fake US local schema | MEDIUM | Empty city data today |
| T10 | Bing verification when code exists | `analytics-config.ts` | Bing/Copilot crawl | LOW | Bing account |

---

## PHASE 3 — UK SEO

| Task ID | Task | Files | Expected result | Priority | Dependencies |
|---------|------|-------|-----------------|----------|--------------|
| U1 | Strengthen `/uk` as commercial hub (GBP, postcode, wholesale, catalogue, food info) | `uk/page.tsx` | Rank for Indian spices UK / supplier UK | HIGH | T2 |
| U2 | Differentiate `/wholesale/uk` (MOQ, buyer types, quote) vs `/uk` (retail+delivery) | `wholesale-landings.ts` | Two intents, one cluster each | HIGH | U1 |
| U3 | Unique product/guide titles: spice + UK delivery where fulfilment is true | product + spice-guide metadata | Rank cumin/turmeric UK without new URLs | HIGH | T6 |
| U4 | Internal links: guide → product → wholesale/uk → /uk | `spice-hub-links.ts`, guides | Entity graph | MEDIUM | U3 |
| U5 | **Do not** add `/uk/indian-spice-exporter` unless export positioning is accurate | — | Avoid thin URLs | — | Business |

---

## PHASE 4 — Europe SEO

| Task ID | Task | Files | Expected result | Priority | Dependencies |
|---------|------|-------|-----------------|----------|--------------|
| E1 | Deepen DE/FR/NL/IE pages (delivery, VAT honesty, popular spices, wholesale CTA) | `country-pages.ts` | Quality > new countries | HIGH | Fulfilment true |
| E2 | English only; no fake `de-DE` hreflang | country pages | Valid i18n | HIGH | T3 |
| E3 | New country URLs (AT, SE, …) **only** with unique fulfilment facts | `country-pages.ts` | No doorways | MEDIUM | Ops |
| E4 | Optional `/wholesale` sections per country via internal links, not `/wholesale/germany` clones | wholesale page | Enquiry | MEDIUM | E1 |

---

## PHASE 5 — Content

| Task ID | Task | Files | Expected result | Priority | Dependencies |
|---------|------|-------|-----------------|----------|--------------|
| C1 | Align terms/returns/press with actual UK/EU delivery **without** saying “we don’t serve USA” as a block | `terms`, `returns`, `press` | Trust + consistency | HIGH | Legal review |
| C2 | Expand food-information / allergens as UK/EU compliance SEO | legal pages | Differentiator | MEDIUM | Accuracy |
| C3 | Spice encyclopaedia answer blocks (already started) | spice-guide | AI citations | MEDIUM | No fake facts |
| C4 | One UK bulk blog exists — add DE/FR only if unique | `blog-posts.ts` | Links | LOW | C3 |
| C5 | llms.txt / llms-full: remove “USA city delivery pages” if those 404 | `llms-full.txt/route.ts` | Honest AI | MEDIUM | T1 |

---

## PHASE 6 — Internal linking

| Task ID | Task | Files | Expected result | Priority | Dependencies |
|---------|------|-------|-----------------|----------|--------------|
| L1 | Footer/nav: UK, EU, wholesale, supplier (already partly done) | `Footer.tsx` | Discoverability | MEDIUM | None |
| L2 | Product PDP: UK delivery + wholesale + guide | product page | Commercial path | HIGH | U4 |
| L3 | Fix comment/legacy US city link group | `seo-internal-links.ts` | No US metro doorways | LOW | T1 |
| L4 | Do not revive `/cities/*` US doorways | city-pages | Avoid thin local SEO | CRITICAL | Policy |

---

## PHASE 7 — Authority / backlinks

Off-site. Not a code sprint.

| Task ID | Task | Expected result | Priority |
|---------|------|-----------------|----------|
| B1 | GSC property + sitemap submit (real 200 URLs) | Query data for UK vs US | CRITICAL |
| B2 | GA4 acquisition by country (uses existing `G-PGFC0DCL1C`) | Independent of admin pie | CRITICAL |
| B3 | UK: Indian grocer/foodservice/chef sites — one real link beats directories | UK referrals | HIGH |
| B4 | Do not buy US or UK directory spam | Avoid | — |
| B5 | Merchant Center: add GB destination **and keep US** if products may show in US Search | Shopping both markets | HIGH |

---

## PHASE 8 — AI search discoverability

| Task ID | Task | Files | Expected result | Priority | Dependencies |
|---------|------|-------|-----------------|----------|--------------|
| I1 | Keep `/llms.txt` factual: India origin, UK/EU quotes, 10kg wholesale | `llms.txt/route.ts` | Citations | MEDIUM | C5 |
| I2 | Organization schema matches visible NAP (UK + India addresses already in footer) | `seo.ts` | Entity | MEDIUM | None |
| I3 | No “AI meta tag”; no fake certs | — | Policy | — | — |

---

## Suggested sequence

1. **A1–A6 + T1** (see traffic clearly; stop sitemap 404s)  
2. **T4–T7 + U1–U3** (UK chrome + Shopping GB **plus** US)  
3. **E1–E2** (DE/FR/NL/IE quality)  
4. **C1–C5, L2**  
5. **B1–B2** in parallel from day 1 (accounts, not code)

Stop here until approval.
