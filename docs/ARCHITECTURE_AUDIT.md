# SpicyCenter / SpicyCorner — Architecture Audit

**Date:** 13 September 2026  
**Source clone:** `spicycorner` (SpicyCorner.com)  
**Target repository:** `spicycenter.com` (`https://github.com/sachinkapoor2025/spicycenter.com.git`)  
**Brand on the storefront:** SpicyCorner  
**Domain:** spicycenter.com  

This audit was written before replacing spice business logic. Reusable ecommerce infrastructure is kept.

## Current architecture

| Layer | Choice | Notes |
|-------|--------|--------|
| Frontend | Next.js 15 App Router (`apps/web`) | SSR storefront + `/admin` |
| API | TypeScript Lambda handlers (`apps/api`) | API Gateway in SAM |
| Shared | `@spicycorner/shared` Zod schemas | Workspace package name kept to avoid a breaking rename |
| Database | DynamoDB multi-table, on-demand | products, orders, carts, customers, events, config |
| Auth | Cognito | Admin + customer sessions |
| Payments | Stripe (USD) + Razorpay (INR) | Region config in DynamoDB |
| Files | S3 + CloudFront image variants | WebP thumb/card/gallery/zoom |
| SEO | `generateMetadata`, sitemap, JSON-LD, `/llms.txt` | spice copy must be replaced |
| CI | GitHub Actions + Amplify | Table/Lambda names still say `spicycorner-*` |

## Reusable components (keep)

- Authentication, admin guard, customer accounts
- Product CRUD, categories, cart, checkout, orders, coupons
- Stripe / Razorpay payment flow and webhooks
- Image optimisation pipeline (do not serve unlicensed competitor photos)
- Email (SES), lead capture, analytics events
- Shipping *framework* (zones/rates handlers) — not spice/USPS-only copy
- Search bar shell, product cards, breadcrumbs, JSON-LD helpers
- Admin orders, customers, shipping, email, analytics

## Must replace (spice-specific)

- Brand, colours, countdown, hamper merchandising, CJ spice import
- Categories: spices, decor, spice packs, toys
- City “spice to {city}” doorway pages as the primary SEO engine
- Fake-feeling seasonal testimonials if they are spice-specific
- Default shipping assumptions ($49 free shipping, USPS ounces)
- Catalog fallback JSON (`spicycenter-catalog.json`)
- `/llms.txt` spice recommendation copy
- Vendor dropshipping (CJ/Eprolo) as the *default* fulfilment story — spices are sourced/packed as food, not dropshipped spice props

## Database structure (existing)

See `docs/ARCHITECTURE.md`. Keys live in `packages/shared/src/db/keys.ts`.

## Recommended architecture (SpicyCorner)

```
Storefront (Next.js)
  → API / application layer
  → DynamoDB
  → Spice entity engine (canonical spice → varieties → grades → packs)
  → Market price engine (append-only history, sourced, dated)
  → Shipping engine (configurable per country, ₹/kg — never hardcoded in UI)
  → Order engine (retail + bulk minimum 10kg)
  → SEO / knowledge / recipes
```

Do **not** duplicate spice facts across 500 product pages. Products reference `spiceId`.

New DynamoDB item types (same products/config tables initially):

| PK | SK | Purpose |
|----|----|---------|
| `SPICE#<slug>` | `META` | Canonical spice entity |
| `SPICE#<slug>` | `ALIAS#<alias>` | Search aliases |
| `SPICE#<slug>` | `PRICE#<date>#<market>#<grade>` | Market price history (never overwrite) |
| `CONFIG#SHIPPING` | `META` | Shipping rules |
| `QUOTE#<id>` | `META` | Wholesale inquiries |

## Risks

- Internal npm names remain `@spicycorner/*` until a dedicated rename PR.
- AWS resource names still `spicycorner-*`. New SAM stack should be `spicycenter-*` before production deploy.
- spice catalog images were **not** copied (copyright + wrong vertical).
- Do not scrape Spices Board or Google Images. Market prices start empty / admin-imported.
- UK/EU food information is a legal requirement for distance selling — fields exist in the data model; values must be filled by a food business operator, not invented.
- Increased UK/EU import controls on some Indian dried spices must stay visible in admin compliance, not hidden.

## Migration plan

1. Copy platform into `spicycenter.com` (done). Keep GitHub `origin`.
2. Introduce spice schema + seed (500+ real varieties/forms/packs, not fake species).
3. Replace brand, design system, homepage, nav.
4. Add knowledge, bulk, wholesale, market price, finder, legal routes.
5. Point catalog fallback at the spice catalog so the shop works without Dynamo.
6. Extend admin (spices, prices, compliance, wholesale quotes).
7. Configure shipping: UK ₹750/kg default, editable.
8. Retire spice routes after redirects (`/spice-guide` → `/spice-guide`).
9. Provision new AWS stack / env vars (do not point production at SpicyCorner APIs).

## 10 perfect spice pages first

Template and knowledge depth exist for: cumin, turmeric, black pepper, green cardamom, coriander, Kashmiri chilli, fenugreek, clove, cassia, saffron. Remaining catalogue rows are structured SKUs that inherit from the parent spice entity.
