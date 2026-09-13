# AGENTS.md — SpicyCorner / spicycenter.com

Read `docs/ARCHITECTURE_AUDIT.md` before large changes.

This is SpicyCorner infrastructure rebranded to **SpicyCorner** on domain **spicycenter.com**.

Keep: auth, admin, cart, checkout, orders, payments, SEO helpers, image pipeline.

Replace: spice merchandising, CJ-as-catalog, fake reviews, hard-coded festival shipping.

Spice data lives in `data/spices.json` (generated) plus `packages/shared` schemas. Storefront loader: `apps/web/src/lib/spice-data.ts`.

Do not auto-publish generated encyclopaedia copy. Do not overwrite market-price history.
