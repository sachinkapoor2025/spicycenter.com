# Keyword research specification (100,000+ **records**)

**Rule:** Combinatorial rows are **unvalidated** until a volume source is attached. Do not publish one URL per row.

## Current state

| Asset | Reality |
|-------|---------|
| `seo-keywords.data.json` | Stub (~8 keywords) |
| `keyword-clusters.ts` | ~7 clusters, thousands of **mapped phrases** onto existing wholesale URLs |
| Workbook (external) | Planning input only until mapped to live slugs + GSC |

## Record schema (proposed)

`keyword`, `validationStatus` (`generated` \| `gsc` \| `ads` \| `third_party`), `volume`, `volumeSource`, `volumeDate`, `difficulty?`, `intent`, `country`, `language`, `productId?`, `locationId?`, `buyerType?`, `form?`, `serpFeatures?`, `canonicalUrl`, `cannibalizationGroup`, `priority`, `editorialStatus`.

## Dimensions (for generation)

Product × form × grade × application × buyer type × country × city × language × wholesale/bulk/import/private-label modifiers.

Label every generated row `validationStatus=generated`.

## Mapping policy

One page owns a cluster. Example: “turmeric wholesale UK”, “bulk turmeric UK”, “haldi wholesale United Kingdom” → `/wholesale/turmeric` + `/spice-guide/turmeric` + `/uk` (internal links), **not** three new URLs.

## Validation sources (authorized)

1. Google Search Console (existing queries) — **first**.
2. GA4 landing pages.
3. Paid search search-term reports if Ads is live.
4. Licensed keyword tools — store `volumeSource`.

## Acceptance

A 100k-row table is a **planning database**. Publishing schedule = rows with `validationStatus!=generated` **and** `canonicalUrl` that already 200s or is in an approved content ticket.
