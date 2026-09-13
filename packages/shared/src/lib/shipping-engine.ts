/**
 * Configurable shipping engine. Do not hardcode ₹750/kg in product UI.
 * Customs duty and VAT are separate line items unless admin marks them included.
 */

export type ShippingChannel = "retail" | "bulk";

export type ShippingRateRule = {
  id: string;
  zone: string;
  country: string;
  countryName: string;
  currency: "INR" | "GBP" | "EUR" | "USD";
  baseCharge: number;
  perKgCharge: number;
  additionalKgCharge: number;
  minimumCharge: number;
  minimumWeightKg: number;
  freeShippingThreshold: number | null;
  bulkRateMultiplier: number;
  includesCustomsDuty: boolean;
  includesVat: boolean;
  notes: string;
  effectiveFrom: string;
};

export const DEFAULT_SHIPPING_RATES: ShippingRateRule[] = [
  {
    id: "uk-inr-per-kg",
    zone: "UK",
    country: "GB",
    countryName: "United Kingdom",
    currency: "INR",
    baseCharge: 0,
    perKgCharge: 750,
    additionalKgCharge: 750,
    minimumCharge: 750,
    minimumWeightKg: 1,
    freeShippingThreshold: null,
    bulkRateMultiplier: 1,
    includesCustomsDuty: false,
    includesVat: false,
    notes:
      "Default UK rate is ₹750 per kg of shipment weight, configurable in admin. Does not include UK import duty or VAT unless separately configured.",
    effectiveFrom: "2026-09-13",
  },
  {
    id: "eu-placeholder",
    zone: "EU",
    country: "EU",
    countryName: "European Union",
    currency: "INR",
    baseCharge: 0,
    perKgCharge: 0,
    additionalKgCharge: 0,
    minimumCharge: 0,
    minimumWeightKg: 1,
    freeShippingThreshold: null,
    bulkRateMultiplier: 1,
    includesCustomsDuty: false,
    includesVat: false,
    notes: "EU per-kg rate must be configured in admin before quoting customers.",
    effectiveFrom: "2026-09-13",
  },
];

export function chargeableWeightKg(actualKg: number, minimumWeightKg: number): number {
  return Math.max(actualKg, minimumWeightKg);
}

export function quoteShipping(opts: {
  rule: ShippingRateRule;
  weightKg: number;
  merchandiseTotal: number;
  channel?: ShippingChannel;
}): {
  chargeableKg: number;
  amount: number;
  currency: ShippingRateRule["currency"];
  includedDuty: boolean;
  includedVat: boolean;
  configured: boolean;
  breakdown: { label: string; amount: number }[];
} {
  const { rule, merchandiseTotal, channel = "retail" } = opts;
  const configured = rule.perKgCharge > 0 || rule.baseCharge > 0 || rule.minimumCharge > 0;
  const chargeableKg = chargeableWeightKg(opts.weightKg, rule.minimumWeightKg);
  const perKg = channel === "bulk" ? rule.perKgCharge * rule.bulkRateMultiplier : rule.perKgCharge;
  let amount = rule.baseCharge + chargeableKg * perKg;
  if (chargeableKg > 1 && rule.additionalKgCharge !== perKg) {
    amount = rule.baseCharge + perKg + (chargeableKg - 1) * rule.additionalKgCharge;
  }
  amount = Math.max(amount, rule.minimumCharge);
  if (rule.freeShippingThreshold != null && merchandiseTotal >= rule.freeShippingThreshold) {
    amount = 0;
  }
  return {
    chargeableKg,
    amount,
    currency: rule.currency,
    includedDuty: rule.includesCustomsDuty,
    includedVat: rule.includesVat,
    configured,
    breakdown: [
      { label: "Product price", amount: merchandiseTotal },
      { label: "Shipping", amount },
      { label: "Taxes / VAT", amount: rule.includesVat ? 0 : 0 },
      { label: "Customs / duties", amount: rule.includesCustomsDuty ? 0 : 0 },
    ],
  };
}

export function ruleForCountry(
  country: string,
  rules: ShippingRateRule[] = DEFAULT_SHIPPING_RATES
): ShippingRateRule | undefined {
  const code = country.toUpperCase();
  return rules.find((r) => r.country === code) ?? rules.find((r) => r.zone === code);
}
