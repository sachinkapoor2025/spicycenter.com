# Master prompt verification (19 September 2026)

Honest status against the global B2B brief. **Done** = shipped in repo. **Partial** = started, not complete. **Not done** = not implemented (and should not be faked).

| # | Asked in prompt | Status | Evidence |
|---|-----------------|--------|----------|
| P0 | Do not destroy existing shop/auth/cart/checkout | Done | No checkout/auth rewrite |
| P0 | Standard enquiry free; no forced $9 | Done (already) | `/leads`, `/bulk/enquiries`; $9 only legacy sample-fee migrate to optional £29 |
| P0 | No thin city doorway farm | Done | `/cities` empty; no city generator |
| P0 | Do not claim 100k validated volumes | Done | Copy + `meta.validation` |
| P0 | Do not invent certs/MOQ/health claims | Done | Market/sourcing copy states quotes confirm facts |
| P0 | Do not deploy without approval | Partial | Code pushed; Amplify still needs `NEXT_PUBLIC_SITE_URL` on the job |
| 1.1 | Stack / architecture audit | Done | `SEO-AUDIT/technical-findings.md` |
| 1.2 | Repo history review | Done | Same + git `main` |
| 1.3 | Live website crawl | Partial | HTTP sample (robots/sitemap/host 404s); not full Sitebulb crawl |
| 1.4 | GSC/GA4 traffic baseline | Not done | No credentials in session |
| 2.1 | Taxonomy rice/pulses/makhana/dry fruit | Not done | Catalog remains spice-only |
| 2.2 | Full product entity + editorial workflow | Partial | Existing spice entities; no CMS statuses UI |
| 2.3 | Location model country/state/city | Partial | 48 country hubs only; no city pages |
| 2.4 | URL architecture | Partial | Kept `/products`, `/spices`, `/spice-guide`; added `/markets`, `/sourcing`, `/keyword-map` |
| 3 | 1,400+ unique food profiles | Not done | ~1,410 spice SKUs already; not 1,400 new foods |
| 3.3 | Draft→published editorial workflow | Not done | Docs only |
| 4 | Dedicated GCC/Africa/LATAM unique import guides | Partial | 48 market hubs + enquiry; not deep country research |
| 4.3 | Real hreflang / translated sites | Not done | English-only; existing en-GB tags |
| 5 | 100,000+ keyword database on site | Done | `data/keyword-universe/` + `/keyword-map` search + map to hubs |
| 5.2 | Validated volume/difficulty | Not done | Workbook is generated seed |
| 5.3 | Keyword-to-URL mapping | Done | Phrase → `/markets/{country}` + `/sourcing/{product}` |
| 6.1 | Remove mandatory enquiry payment | Done (already) | None required |
| 6.2 | Professional enquiry form | Partial | Wholesale + bulk forms exist; not one unified form |
| 6.3 | Product-page free enquiry CTAs | Done | PDP + `FreeEnquiryCtas` |
| 6.4 | Optional paid add-ons only | Done (already) | UK/EU sample/docs |
| 6.5 | Lead ID, inbox, admin, spam | Partial | Two pipelines; bulk has `BE-` IDs; attribution on bulk still thin |
| 7 | SEO content hubs (rice, makhana, etc.) | Not done | Spice guides/journal only |
| 8 | Technical SEO (sitemap/robots/canonicals) | Partial | Sitemap drops geo 404s; site URL default `www.spicycenter.com`; live Amplify host until env set |
| 9 | Performance / CWV programme | Not done | Not measured |
| 10 | Enquiry analytics events | Not done | Tags exist; no enquiry conversion events added |
| 11 | Admin for keywords/countries | Not done | File-based import script only |
| 12 | Staged rollout / preview / rollback runbook executed | Not done | Docs only |
| 15-day 5k users | Guarantee traffic | Not done | Cannot be guaranteed; roadmap documented |

Workbook columns used: `keyword`, `product_or_category`, `intent`, `country`, `target_market` → stored in `keywords.jsonl.gz` (100,000 rows).
