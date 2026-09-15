import type { ShippingRate } from "./types";

/** Admin-configurable defaults. Do not treat these as including customs duty or VAT. */
export const SHIPPING_RATES: ShippingRate[] = [
  {
    id: "uk-retail-bulk",
    region: "United Kingdom",
    country: "United Kingdom",
    countryCode: "GB",
    currency: "INR",
    baseCharge: 0,
    perKgCharge: 750,
    minimumCharge: 750,
    additionalKgCharge: 750,
    minWeightKg: 1,
    retailRatePerKg: 750,
    bulkRatePerKg: 750,
    effectiveDate: "2026-09-13",
    notes: "Default UK rate billed per kg of chargeable weight with a 1kg minimum. Quoted in GBP on the storefront. Does not include UK import duty or VAT unless separately configured.",
  },
  {
    id: "eu-placeholder",
    region: "European Union",
    country: "EU (configure per country)",
    countryCode: "EU",
    currency: "INR",
    baseCharge: 0,
    perKgCharge: 0,
    minimumCharge: 0,
    additionalKgCharge: 0,
    minWeightKg: 1,
    effectiveDate: "2026-09-13",
    notes: "EU per-kg rate is not assumed. Set country rates in admin before offering checkout to that country.",
  },
];

export function quoteShipping(opts: {
  countryCode: string;
  weightKg: number;
  mode: "retail" | "bulk";
}): {
  rate: ShippingRate | undefined;
  billableKg: number;
  shippingInr: number | null;
  includesDutyOrVat: false;
  message: string;
} {
  const code = opts.countryCode.toUpperCase();
  const rate = SHIPPING_RATES.find((r) => r.countryCode === code) ?? (code !== "GB" ? SHIPPING_RATES.find((r) => r.countryCode === "EU") : undefined);
  if (!rate) {
    return { rate: undefined, billableKg: opts.weightKg, shippingInr: null, includesDutyOrVat: false, message: "No shipping rule for this country yet." };
  }
  const billableKg = Math.max(opts.weightKg, rate.minWeightKg);
  const perKg = opts.mode === "bulk" ? rate.bulkRatePerKg ?? rate.perKgCharge : rate.retailRatePerKg ?? rate.perKgCharge;
  if (!perKg) {
    return {
      rate,
      billableKg,
      shippingInr: null,
      includesDutyOrVat: false,
      message: rate.notes,
    };
  }
  const shippingInr = Math.max(rate.minimumCharge, rate.baseCharge + perKg * billableKg);
  return {
    rate,
    billableKg,
    shippingInr,
    includesDutyOrVat: false,
    message: `Shipping for ${billableKg}kg to ${rate.region} is quoted in your storefront currency (GBP in the UK, EUR in the EU). Product price, postage, taxes/VAT, and customs duty are separate unless an admin rule says otherwise.`,
  };
}
