# SpicyCenter Phase 1 — Audit pack

**Date:** 19 September 2026  
**Scope:** Phase 1 only (repository + live HTTP inspection). **No large-scale implementation in this pass.**  
**Live domain crawled:** `https://www.spicycenter.com/` (also `https://spicycenter.com/` via Amplify/CloudFront).  
**Repo:** `https://github.com/sachinkapoor2025/spicycenter.com.git` · branch `main` @ `c7f8800`  
**Constraint:** Protect existing USA-accessible URLs. Do not publish 100,000 pages. Do not invent supply, certifications, or search volume.

## Documents in this folder

| File | Purpose |
|------|---------|
| [traffic-baseline.md](./traffic-baseline.md) | What we can and cannot measure; GA4/GSC access gap |
| [country-performance.md](./country-performance.md) | USA / UK / EU / Middle East signal vs live pages |
| [landing-page-performance.md](./landing-page-performance.md) | Live URL inventory and likely traffic assets |
| [technical-findings.md](./technical-findings.md) | Stack, crawl, canonical, sitemap, schema |
| [implementation-risks.md](./implementation-risks.md) | What a global rewrite would break |
| [route-inventory.md](./route-inventory.md) | Public routes grouped by purpose |
| [enquiry-flow.md](./enquiry-flow.md) | Free enquiry vs optional Stripe add-ons |
| [architecture-proposal.md](./architecture-proposal.md) | Recommended IA after audit (not built) |
| [keyword-research-spec.md](./keyword-research-spec.md) | How to grow a 100k **database**, not 100k pages |
| [15-day-roadmap.md](./15-day-roadmap.md) | Aggressive growth plan without traffic guarantees |
| [phased-backlog.md](./phased-backlog.md) | Ordered work after this audit is approved |
| [traffic-analysis.md](./traffic-analysis.md) | Prior audit (15 Sep 2026) — still useful; some chrome already changed |
| [implementation-plan.md](./implementation-plan.md) | Prior UK/EU plan (approval required) |

## Executive decision

SpicyCenter today is a **UK/EU spice storefront + 10kg wholesale + 100kg bulk enquiry**, with **~1,410 spice SKUs** and **88 spice entities**. It is **not** yet a multi-category Indian food export marketplace (no rice, pulses, makhana, or dry-fruit catalog).

The highest-ROI next steps are **technical SEO hygiene**, **enquiry conversion measurement**, and **honest market hubs** — not a new CMS or mass city pages.

## Status after 19 Sep implementation pass

Imported `spicycenter_global_keyword_universe_100k.xlsx` as a **mapped database** (not 100,000 pages):

- `/markets` + 48 country hubs
- `/sourcing/{product}` for the 7 workbook products
- `/keyword-map` search over 100,000 seeds
- Sitemap no longer lists unrouted geo 404s
- Production `getSiteUrl()` defaults to `https://www.spicycenter.com`
- Free enquiry CTAs on product, market, and sourcing pages

Still **not** done from the master brief: GSC/GA4 baselines, rice/pulses/makhana catalog, 1,400 unique food entities, validated keyword volumes, full admin CMS, CWV programme, production Amplify env `NEXT_PUBLIC_SITE_URL` until deploy.

## What this audit did **not** do

- Did not log into Google Search Console or GA4 (no credentials in this session).
- Did not run a full site crawl (Screaming Frog / Sitebulb).
- Did not measure Core Web Vitals in the field (CrUX / PageSpeed API not run).
- Did not change production.
- Did not merge or deploy uncommitted local work (`LiveMandiPriceBoard` pagination is local-only).
