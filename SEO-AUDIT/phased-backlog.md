# Phased development backlog (after audit approval)

Each later phase must state: what changes, why, what it affects, how to test, how to roll back.

## Step 1–3 (done / in this pack)

Repository audit, live HTTP sample, risk assessment, enquiry diagram, taxonomies as **proposal**.

## Step 4–5 — Enquiry (low risk)

1. Analytics on forms.  
2. Bulk attribution fields.  
3. PDP → free enquiry with product slug.  
**Affects:** forms, `/events`, bulk API.  
**Test:** submit wholesale + bulk with and without add-ons; US/CA no Stripe.  
**Rollback:** revert form commits.

## Step 6 — Taxonomy (data, not 1,400 new URLs)

Editorial fields on spice entities. Category family enum. No public rice URLs until inventory exists.

## Step 7 — Technical SEO (highest SEO ROI)

1. `NEXT_PUBLIC_SITE_URL`.  
2. Sitemap 200-only.  
3. UK canonical.  
4. Verify live H1/feed leftovers.  
**Test:** curl robots Host, sitemap loc prefix, sample geo URL absent.  
**Rollback:** env + sitemap commit.

## Step 8–9 — Content + markets

Quality templates; UAE hub if approved; no doorway cities.

## Step 10 — Keyword database

Dynamo or CSV + admin mapping UI. Generated vs validated.

## Step 11–12 — Analytics + performance

Admin country×source; measure CWV before/after tag reduction.

## Step 13–14 — Staging then production

Amplify preview branch. Explicit owner approval before `main`.

## Explicitly deferred

- 1,400 new food SKUs  
- 100k public pages  
- Full CMS  
- Fake multilingual hreflang  
- Mandatory enquiry payment  
- Production deploy from this audit

## Related prior plan

See [implementation-plan.md](./implementation-plan.md) (A1–A6 analytics, T1 sitemap) — still valid and **approval required**.
