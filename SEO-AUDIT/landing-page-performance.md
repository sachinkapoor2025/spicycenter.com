# Landing-page performance (inventory + hypotheses)

**Date:** 19 September 2026  
**Live HTTP sample:** 200 on `/`, `/uk`, `/wholesale`, `/bulk-enquiry`, `/products`, `/llms.txt`. 404 on `/countries/usa`, `/markets/uae`, `/countries/india/uttar-pradesh`.

GSC “top pages” not available. Hypotheses below are **architecture-based** — replace with GSC export.

## Likely existing assets (do not delete)

| URL | Role | Live status |
|-----|------|-------------|
| `/` | Brand + retail + bulk CTA | 200 |
| `/products`, `/products/{slug}` | ~1,410 SKUs | listing 200 |
| `/spices`, `/spices/{slug}` | Shop hub + spice entities | assumed 200 |
| `/spice-guide`, `/spice-guide/{slug}` | 88 knowledge pages | high SEO value |
| `/recipes/{slug}` | ~44 | knowledge |
| `/wholesale`, `/wholesale/*` | 16 B2B landings | `/wholesale` 200 |
| `/bulk-enquiry` | 100kg+ quote | 200, free submit |
| `/uk`, `/eu`, `/europe/indian-spices` | Market hubs | `/uk` 200 |
| `/countries/{uk,de,fr,…}` | 8 EU country pages | not all probed |
| `/spice-market-prices` | Mandi board | exists in repo; live not re-probed this pass |
| `/categories/{slug}` | 8 category URLs | keep |

## Competing / thin / missing

| URL | Issue |
|-----|--------|
| `/uk` **and** `/countries/uk` | Same intent cluster |
| `/uk/indian-spices` | Documented redirect to `/spices` |
| Sitemap geo paths (`/countries/{country}/{region}…`) | **~246 nested country locs** in live sitemap; sample path **404** |
| ~58 sitemap locs containing `usa` | Almost certainly **404 or wrong host** |
| `/cities/*` | Route exists; location JSON empty |
| `/markets/*` | **No storefront route** |
| Rice / pulses / makhana / dry fruit | **No product pages** |

## Enquiry CTA coverage

| Surface | Free enquiry? |
|---------|----------------|
| `/wholesale` + landings | Yes → `/leads` |
| `/contact` | Yes → `/leads` |
| `/bulk-enquiry` | Yes → `POST /bulk/enquiries` |
| Product PDP | Lead capture `source: product`; not a full B2B spec form |
| Spice guide | Internal links to shop/wholesale (not universal) |

## Conversion hypothesis (to test, not claimed)

Traffic without enquiry events is the current gap. First measurement win: fire GA4 + `/events` on wholesale/bulk/contact submit.

## Homepage live copy (19 Sep)

- Positions **UK & Europe** delivery, 10kg wholesale, India origin.
- Trust line still includes “Delivering in 5–7 days” — verify against actual shipping policy before scaling that claim.
- Reviews: native only; no invented stars.
