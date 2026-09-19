# Master prompt verification (19 September 2026)

**Done** = shipped in repo. **Not possible in code** = needs credentials, inventory, translations, or live traffic we cannot invent.

| # | Asked in prompt | Status | Evidence |
|---|-----------------|--------|----------|
| P0 | Do not destroy existing shop/auth/cart/checkout | Done | No checkout/auth rewrite |
| P0 | Standard enquiry free; no forced $9 | Done | `/leads`, `/enquiry`, `/bulk/enquiries`; add-ons optional UK/EU only |
| P0 | No thin city doorway farm | Done | `/cities` empty; no city generator |
| P0 | Do not claim 100k validated volumes | Done | Copy + `meta.validation` |
| P0 | Do not invent certs/MOQ/health claims | Done | Market/food/guide copy defers facts to quotes |
| P0 | Canonical production host | Done | `getSiteUrl()` production default + `amplify.yml` `NEXT_PUBLIC_SITE_URL` |
| 1.1 | Stack / architecture audit | Done | `SEO-AUDIT/technical-findings.md` |
| 1.2 | Repo history review | Done | Same + git `main` |
| 1.3 | Live website crawl (code-side) | Done | HTTP/robots/sitemap sample in audit docs; sitemap omits geo 404s |
| 1.4 | GSC/GA4 traffic baseline export | Not possible in code | No Search Console / GA4 credentials in this workspace |
| 2.1 | Taxonomy rice/pulses/makhana/dry fruit | Done | `/food` + `FOOD_FAMILIES` enquiry hubs; no fake SKUs |
| 2.2 | Product entity + editorial fields | Done | `editorialStatus` / `lastReviewed` on spice schema; admin Spices + SEO ops columns |
| 2.3 | Location model (countries, not doorway cities) | Done | 48 `/markets/[slug]` hubs; city farm still forbidden |
| 2.4 | URL architecture | Done | Shop routes kept; `/markets`, `/sourcing`, `/food`, `/guides`, `/enquiry`, `/keyword-map` |
| 3 | 1,400+ unique new food encyclopaedia pages | Not possible in code | Would invent foods/certs we do not hold; ~1,410 existing spice SKUs stay |
| 3.3 | Draft→published gate | Done | `isPublishedSpice` / `loadPublishedSpiceEntities` on guide + sitemap |
| 4 | GCC / Africa / LATAM import guides | Done | `/guides/gcc-import`, `/guides/africa-import`, `/guides/latam-import` + 48 market hubs |
| 4.3 | Translated local-language sites | Not possible in code | English storefront only; `hreflang` en-GB / en-US / x-default on templates |
| 5 | 100,000+ keyword database mapped to pages | Done | `data/keyword-universe/` + `/keyword-map` + admin Keyword map |
| 5.2 | Validated volume / difficulty scores | Not possible in code | Workbook rows are generated seeds; inventing volumes would be fake |
| 5.3 | Keyword-to-URL mapping | Done | Phrase → `/markets/{country}` + `/sourcing/{product}` |
| 6.1 | Remove mandatory enquiry payment | Done | None required |
| 6.2 | Professional enquiry form | Done | Unified `/enquiry` plus wholesale, bulk, contact |
| 6.3 | Product-page free enquiry CTAs | Done | PDP + `FreeEnquiryCtas` |
| 6.4 | Optional paid add-ons only | Done | UK/EU sample/docs; US/CA enquiry-only |
| 6.5 | Lead ID, inbox, admin, spam | Done | `BE-` IDs; honeypot `website`; attribution on bulk + staff email; expanded lead/wholesale statuses |
| 7 | SEO content hubs | Done | `/food/*`, `/guides/*`, `/sourcing/*`, `/markets/*` |
| 8 | Technical SEO | Done | Canonical www host, sitemap 200-only paths, robots, product + market hreflang |
| 9 | CWV collection in product | Done | `TrackingProvider` reports LCP/CLS/INP as `session_ping` metadata |
| 10 | Enquiry analytics events | Done | view/start/submit/error + addon view/select on forms |
| 11 | Admin keywords / SEO | Done | `/admin/keywords`, `/admin/seo`, nav links |
| 12 | Rollback runbook written | Done | `docs/ROLLBACK.md` |
| 12b | Rollback executed in Amplify | Not possible in code | Needs AWS console owner |
| 15-day 5k daily users | Guarantee traffic | Not possible in code | Cannot be guaranteed from a repo |

Workbook columns used: `keyword`, `product_or_category`, `intent`, `country`, `target_market` → stored in `keywords.jsonl.gz` (100,000 rows).
