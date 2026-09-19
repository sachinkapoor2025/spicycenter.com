# Existing route inventory

**Source:** `apps/web/src/app/**/page.tsx` + live probes. Admin routes omitted except as robots-disallow.

## Shop

| Pattern | Notes |
|---------|-------|
| `/` | Home |
| `/products` | Listing; query variants noindex in code |
| `/products/[slug]` | ~1,410 SKUs |
| `/spices` | Shop hub |
| `/spices/[category]` | Category **or** spice slug |
| `/categories/[slug]` | Legacy 8 categories |
| `/bulk-spices`, `/bulk-spices/[slug]` | Redirect to spices + channel |

## Knowledge

| Pattern | Approx. count |
|---------|----------------|
| `/spice-guide`, `/spice-guide/[slug]` | 1 + 88 |
| `/spice-guide/comparisons`, `/comparisons/[slug]`, `/compare/[slug]` | hub + 16 + legacy |
| `/recipes`, `/recipes/[slug]` | 1 + 44 |
| `/journal`, `/journal/[slug]` | 1 + 7 |
| `/blog`, `/blog/[slug]` | few handwritten |
| `/indian-spice-regions`, `/[slug]` | 1 + 8 |
| `/spice-finder`, `/spice-market-prices`, `/faq`, `/about`, `/reviews`, `/press` | utility |

## Location / market

| Pattern | Live? |
|---------|-------|
| `/uk`, `/uk/indian-spices`, `/uk/bulk-indian-spices`, `/uk/indian-spices-wholesale` | yes (some redirect) |
| `/eu`, `/europe/indian-spices`, `/europe/bulk-indian-spices` | yes / redirect |
| `/countries/[slug]` | 8 UK/EU only |
| `/cities/[slug]` | empty data |
| `/markets/[country]` | **does not exist** |
| Geo tree in sitemap | **not routed** |

## B2B

| Pattern | Count |
|---------|-------|
| `/wholesale`, `/wholesale/[slug]` | 1 + 15 |
| `/bulk-enquiry`, `/bulk-enquiry/confirm/[id]` | confirm noindex |
| `/spice-supplier` | 1 |
| `/contact` | 1 |

## Legal / machine

`/terms`, `/privacy`, `/returns`, `/shipping`, `/legal/*`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/humans.txt`, `/api/feed.xml`

## Disallowed

`/admin/*`, `/checkout`, `/account`, `/cart`, `/orders/*`, `/wishlist`, `/ses-email`
