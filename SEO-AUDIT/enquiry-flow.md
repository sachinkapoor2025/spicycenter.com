# Enquiry flow (as built)

**Date:** 19 September 2026  
**Finding:** There is **no mandatory $9 (or any) payment** to submit a standard enquiry.

## Diagram

```
Wholesale / contact / PDP capture
  → POST /leads
  → Dynamo CUSTOMERS (LEAD#)
  → SMTP notify (enquiry@spicycenter.com)
  → Admin /admin/boost-sales?tab=leads
  Status: new | contacted | follow_up | converted

Bulk 100kg+
  → POST /bulk/enquiries
  → Dynamo BulkEnquiries (BE-YYYYMMDD-…)
  → SMTP staff + customer ack
  → /bulk-enquiry/confirm/{id}
  Status: new | quoted | converted | lost | paid_addons
  UK/EU optional Stripe: sample / documentation add-ons only
  US/CA: never charged online
```

## $9 note

Legacy admin `sample_fee_gbp === 9` is migrated to **£29** as an **optional** sample add-on, not a gate. Defaults live in `packages/shared/src/lib/agmarknet-commodities.ts`.

## Gaps vs the master brief

| Requirement | Status |
|-------------|--------|
| Free standard enquiry | **Met** |
| Optional paid add-ons | **Met** (UK/EU sample/docs) |
| Product-preselected CTA on every product | Partial (PDP lead, not full B2B form) |
| Buyer type / qty / destination on one form | Wholesale + bulk differ |
| Unique lead ID | Bulk yes (`BE-…`); general leads are session+timestamp |
| Attribution on bulk | **Missing** |
| Spam/dedupe | Basic; not a full fraud stack |
| Statuses Won/Lost/Spam/Closed | Bulk has subset; general leads simpler |

## What to change later (not this phase)

- Add enquiry analytics events.
- Attach UTM + landing page to bulk records.
- Product-page “Request bulk quote” → `/bulk-enquiry?spice=` or `/wholesale?product=`.
- Do **not** add a paid wall.
