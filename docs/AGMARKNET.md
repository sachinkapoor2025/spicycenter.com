# Agmarknet prices, FX, and bulk enquiry

SpicyCenter stores Indian mandi prints as a **domestic wholesale reference**, not an FOB export price. Customer quotes apply an admin markup (or a manual INR/kg override). Raw Agmarknet figures are never shown as the selling price.

## Secrets

| Where | Name | Purpose |
| --- | --- | --- |
| GitHub Actions repo secret | `AGMARKNET_API_KEY` | data.gov.in / Agmarknet key. **Never commit it.** |
| AWS Secrets Manager | `agmarknet/api-key` | Runtime value the `spicycenter-agmarknet-fetcher-{env}` Lambda reads via `GetSecretValue`. |

Deploy (`deploy.yml`) copies the GitHub secret into Secrets Manager (create or `put-secret-value`) **before** SAM deploy. The Lambda package does not bake the key in.

### Rotate the key

1. Generate a new key on data.gov.in.
2. Update GitHub → Settings → Secrets → Actions → `AGMARKNET_API_KEY`.
3. Re-run **Deploy**, or run:

```bash
aws secretsmanager put-secret-value --secret-id agmarknet/api-key --secret-string 'NEW_KEY'
```

4. Optionally invoke the fetcher: Admin → Bulk Pricing → **Run Agmarknet fetch now**, or:

```bash
aws lambda invoke --function-name spicycenter-agmarknet-fetcher-prod --payload '{"backfill":true}' out.json
```

## Schedule

- Fetcher: EventBridge `cron(30 0 * * ? *)` — 00:30 UTC / 06:00 IST. One run walks **every** spice in `TRACKED_COMMODITIES` (you do not re-run the Lambda per spice).
- FX (Frankfurter INR→GBP,EUR): `cron(45 0 * * ? *)`. Failed FX reads keep the last DynamoDB cache; quotes never use a zero rate.

## data.gov.in limits vs our list of 10+ spices

The storefront list is **our** config in `packages/shared/src/lib/agmarknet-commodities.ts`, not a cap on your API key. Add a row there to track another spice; the next daily run (or **Run Agmarknet fetch now**) picks it up.

data.gov.in default `limit` is often 10 **records per HTTP page**, not 10 commodities. The Lambda sets `limit=100` and paginates until that commodity is complete. Registered keys usually allow on the order of **1,000 requests/day** (check your data.gov.in dashboard). One daily fetch of ~15 spices with pagination is well under that. Do not hammer the API with extra manual runs unless you are backfilling.

Agmarknet “current daily price” only includes markets that reported **that day**. Clove can come back empty on a quiet day; we leave the last good `LATEST` row untouched.

Mandi `modal_price` is stored as ₹/quintal. Bulk quotes convert to ₹/kg (`/ 100`) before markup. Historical rows store `variety` and `grade` when the API sends them; the quote form lists those slices when present.

## Tables

- `SpiceMandiPrices-{env}` — `PK=COMMODITY#<slug>`, `SK=DATE#…#MARKET#…` or `LATEST`.
- `BulkPricingConfig-{env}` — per-spice markup/shipping/charges + add-on fees.
- `BulkEnquiries-{env}` — enquiries, GSI1 by status.

## APIs

Public (CORS `https://spicycenter.com` and `www` only; `Cache-Control` s-maxage 12h):

- `GET {SpicePriceApiUrl}/prices/{commodity}`
- `GET {SpicePriceApiUrl}/prices/{commodity}/history?from=YYYY-MM-DD&to=YYYY-MM-DD`

Same reads plus quotes/enquiries also exist on the main storefront API (`NEXT_PUBLIC_API_URL`).

## Placeholders (confirm with a CHA before live cargo quotes)

- `clearance_charge_inr` default **15000** (editable 10000–20000)
- `testing_charge_inr` default **6000**
- `shipping_rate_inr_per_kg_uk` default **750**
- EU shipping starts equal to UK until admin sets `shipping_rate_inr_per_kg_eu`
- Sample/docs EUR defaults (£9 / £29 counterparts) are **not** auto-converted from GBP
