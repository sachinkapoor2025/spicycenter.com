# SpicyCorner (spicycenter.com)

Indian spice marketplace + encyclopaedia + wholesale, cloned from the SpicyCorner ecommerce platform.

- Brand: **SpicyCorner**
- Domain / repo: **spicycenter.com**
- Git remote: `https://github.com/sachinkapoor2025/spicycenter.com.git`

## What we kept

Cart, checkout, admin, payments, DynamoDB, image pipeline, SEO helpers, email.

## What we added

- Spice entity model (`packages/shared/src/schemas/spice.ts`)
- Configurable shipping engine (UK ₹750/kg default — not hardcoded in UI)
- 88 spice entities and 1,400+ real variety/form/pack SKUs (`npm run catalog:generate`)
- Knowledge, wholesale, market prices, Spice Finder, UK/EU, legal, admin modules

## Local

```bash
npm install
npm run catalog:generate
npm run dev
```

Do not scrape competitor photos or Spices Board pages. Market price rows start empty on purpose.

See `docs/ARCHITECTURE_AUDIT.md`.
