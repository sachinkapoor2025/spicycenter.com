# Implementation risks

**Date:** 19 September 2026

## Traffic protection

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Changing all titles/H1s at once | USA queries that currently hit spice/product/guide pages can drop | Batch by template; keep URLs; GSC monitor |
| New `/products/` tree vs `/spices/` + `/products/{slug}` | Cannibalization + mass 301 | Prefer **extend** current slugs; 301 only when proven |
| Publishing rice/pulses/makhana before supply is real | Misleading B2B; legal/trust | Editorial status: Draft until ops approves |
| 100k keyword pages | Thin/doorway penalty | Keyword **table** → map to few URL types |
| City farms | Already rejected in `ARCHITECTURE_AUDIT.md` | Keep `/cities` empty |
| Geo-blocking USA | Destroys `.com` demand | Never |
| “UK only” chrome that noindexes global guides | Loses USA informational traffic | Guides stay global; market pages are extra |

## Engineering

| Risk | Mitigation |
|------|------------|
| Dual enquiry systems (`/leads` vs BulkEnquiries) | Unify later; do not break either in one commit |
| Adding mandatory payment | **Forbidden** for standard enquiry |
| Dynamo/CMS rewrite | Not required for Phase 2–4; JSON + editorial flags first |
| Amplify `SITE_URL` wrong | One env-var fix; high SEO impact, low code risk |
| Sitemap 404s | Remove `indexableGeoPaths()` until routes exist |
| Client-only i18n + hreflang | Do not add `de-DE` until a German URL exists |
| Uncommitted local mandi UI | Review separately; do not mix with IA rewrite |
| Deploy without preview | Amplify branch + rollback Amplify job |

## Business / content

| Risk | Mitigation |
|------|------------|
| Invented MOQ, transit, certs, health claims | AGENTS.md + editorial workflow |
| 1,400 “product pages” already exist as **pack SKUs**, not 1,400 unique foods | Distinguish **entity** (cumin) vs **SKU** (cumin seeds 1kg) |
| 15-day 5,000 users | Paid + distribution + conversion; **no SEO guarantee** |
| Paid add-ons mistaken for enquiry fee | Keep copy: enquiry free; add-ons optional UK/EU |

## Rollback

- Amplify: redeploy previous `main` job.
- URL changes: keep a redirect map in git; never delete without 301.
- Content: editorial `archived` status, not hard delete.
- Env: revert `NEXT_PUBLIC_SITE_URL` if a change regresses.

## What must not happen in the next sprint

- Blind rewrite of the App Router.
- Cherry-picking unrelated branches.
- Generating GCC city pages from a template.
- Claiming the keyword workbook is validated volume.
