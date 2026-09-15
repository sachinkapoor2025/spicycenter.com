/** Customer-facing shipping copy. Never mention INR/₹ on the UK/EU storefront. */
export const STOREFRONT_SHIPPING_COPY = {
  uk:
    "UK shipping is quoted in GBP at checkout from a weight-based (per kg) rule. Import duty and VAT are extra unless a rate is marked inclusive.",
  eu:
    "EU shipping is quoted in EUR where a country rate is configured. Duty and VAT are extra unless included.",
  combined:
    "Shipping is quoted in your storefront currency — GBP in the United Kingdom and EUR in the EU — from a weight-based rule. Product price, postage, VAT and customs duty are separate line items unless a rule says otherwise.",
  payments:
    "Pay securely with Stripe. The shop displays GBP for UK visitors and EUR for EU visitors. Card details stay with the payment provider.",
  perKgAdmin:
    "The per-kilogram rate is set in admin and converted to the shopper’s display currency (GBP or EUR) at quote time.",
} as const;
