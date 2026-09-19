# Country performance (signals vs pages)

**Date:** 19 September 2026  
**Limitation:** No GSC/GA4 country table. This is live-route + codebase targeting.

## Storefront fulfilment (checkout / quotes)

`EUROPEAN_COUNTRY_CODES` in `packages/shared/src/lib/markets.ts` (16): GB, IE, DE, FR, ES, IT, NL, BE, AT, PT, SE, DK, FI, PL, CZ.

India is **origin**, not a shopper market.

**USA and Canada:** retail checkout is **not** a storefront delivery market. **Bulk enquiry (100kg+)** now supports US/CA as destinations (`c7f8800`) — enquiry-only, no online cargo payment.

**UAE / GCC:** no live `/markets/uae` (404 on 19 Sep). Country slug `ae` exists in older country-page data but is **not served** (`isStorefrontDeliveryCountry` filter). Live `https://www.spicycenter.com/countries/usa` → **404**.

## Priority markets vs current assets

| Market | Live commercial hub? | Risk if we “pivot away” |
|--------|----------------------|-------------------------|
| **USA** | No dedicated `/us` hub. Residual `.com` + possible leftover US Shopping feed. Bulk enquiry US/CA exists. | **Protect:** do not noindex global spice/product URLs to “become UK-only”. Do not 301 US visitors. |
| **UK** | `/uk`, `/wholesale/uk`, `/uk/indian-spices-wholesale`, `/countries/uk` | Duplicate UK hubs (`/uk` vs `/countries/uk`) |
| **EU** | `/eu`, `/europe/indian-spices`, `/countries/{de,fr,es,it,nl,ie,be}` | English-only; hreflang collisions historically |
| **UAE / GCC** | **None live** | Creating hubs is **new work**; must not invent warehouses or import promises |
| **Canada / AU / NZ** | No shopper market pages | CA bulk enquiry only |
| **Africa / LATAM / APAC** | No dedicated market pages | Do not mass-generate |

## Analytics country bias (from prior audit)

Admin “USA majority” can be:

1. Real US humans on a `.com`.
2. Default/`en-US`/`America/*` inference (see `traffic-analysis.md`).
3. Direct/tooling sessions.

**Action:** treat USA organic as an **asset to measure in GSC**, not a problem to delete.

## Recommended country order (after GSC validation)

1. Protect USA-indexed spice/product/guide URLs.
2. Strengthen UK (canonical one hub).
3. Deepen existing DE/FR/NL/IE pages.
4. Add **UAE (and then Saudi/Qatar) only** after supply + documentation language is approved.
5. Other countries only with unique demand evidence.

Do **not** assume equal demand for every country listed in the master prompt.
