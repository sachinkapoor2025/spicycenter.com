# Global SEO architecture (proposal only)

**Status:** Design after Phase 1. **Not implemented.**

## Principle

Keep existing **spice entity → SKU** model. Add **food categories** only when the business can source them. Map many keywords to few page types.

## Recommended URL choices (fit current site)

| Type | Keep / add | Do not |
|------|------------|--------|
| SKU | Keep `/products/{slug}` | Do not move 1,410 URLs |
| Spice entity shop | Keep `/spices/{slug}` | Do not also create `/products/spices/{slug}` |
| Knowledge | Keep `/spice-guide/{slug}` | Duplicate encyclopaedia |
| Category | Keep `/categories/{slug}` + `/spices/{category}` (consolidate later) | Third tree |
| B2B | Keep `/wholesale`, `/bulk-enquiry` | Paid wall |
| Country | Keep `/uk`, `/countries/{iso}` → **pick one canonical per country** | `/markets/usa` **and** `/countries/usa` **and** `/uk` clones |
| New categories (rice, pulses, makhana) | **Only after** `data/` entities exist: `/products/rice/`, `/spice-guide` equivalent `/guides/rice/{slug}` | Fake 200 rice SKUs |
| City | None until unique trade-hub content | Template cities |

Optional later (gated, unique copy):

- `/markets/{country}/` as **aliases** that 301 to chosen canonical (`/uk` or `/countries/uk`).
- `/guides/bulk-sourcing/`, `/guides/packaging/` as hubs — one each, not per city.

## Product entity (extend existing SpiceEntity)

Already close: name, slug, aliases, origin, forms, grades, related. Add **editorialStatus**, **lastReviewed**, **categoryFamily** (`spice` \| `rice` \| `pulse` \| `makhana` \| …), **doNotPublish**.

Do not auto-publish generated encyclopaedia (`AGENTS.md`).

## Location entity

Country → optional trade hub. Fields: ISO, language, currency display, publication status. **No page** until `publicationStatus=published` and unique copy exists.

## Product taxonomy (target, not current catalog)

Current live families: whole/ground spices, masalas, chillies, seeds, herbs, barks, roots, flowers.

Future (ops-approved): rice, basmati, pulses, lentils, beans, makhana, millets, dry fruits. **Organic** only if verified.

## Database

Prefer: JSON + Dynamo flags first. A `KEYWORD#` / `SEO_PAGE#` table (`docs/SEO-ARCHITECTURE.md`) is optional **after** sitemap host + 404s are fixed.

## International SEO

- English-first market pages.
- hreflang only for real alternate URLs.
- Currency presentation already GBP/EUR; USD/CAD on bulk enquiry display only.
- No fake local offices.
