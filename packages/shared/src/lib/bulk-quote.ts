import type { AddOnPricing, BulkDestination, BulkPricingSpice, BulkQuoteResult } from "../schemas/bulk-pricing";
import { DEFAULT_BULK_MIN_QTY_KG } from "./agmarknet-commodities";

export function roundQuoteMoney(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Agmarknet mandi prints are ₹/quintal (100 kg). Quotes are always ₹/kg. */
export function mandiQuintalToInrPerKg(modalPerQuintal: number): number {
  if (!Number.isFinite(modalPerQuintal) || modalPerQuintal <= 0) return 0;
  return modalPerQuintal / 100;
}

/**
 * Customer-facing unit price. Never return the raw mandi modal.
 * Admin override wins; otherwise Agmarknet average modal × markup.
 * `agmarknetModalAvgInr` must already be ₹/kg (convert quintal first).
 */
export function customerUnitPriceInrPerKg(opts: {
  adminOverrideInrPerKg?: number | null;
  agmarknetModalAvgInr?: number | null;
  markupPercent: number;
}): { unit: number; source: "admin_override" | "agmarknet_markup" } | null {
  if (opts.adminOverrideInrPerKg && opts.adminOverrideInrPerKg > 0) {
    return { unit: opts.adminOverrideInrPerKg, source: "admin_override" };
  }
  if (opts.agmarknetModalAvgInr && opts.agmarknetModalAvgInr > 0) {
    const unit = opts.agmarknetModalAvgInr * (1 + opts.markupPercent / 100);
    return { unit: roundQuoteMoney(unit), source: "agmarknet_markup" };
  }
  return null;
}

export function computeBulkQuote(opts: {
  spice: BulkPricingSpice;
  qtyKg: number;
  destination: BulkDestination;
  agmarknetModalAvgInr?: number | null;
  fxInrGbp: number;
  fxInrEur: number;
  addOns: AddOnPricing;
  sampleSelected: boolean;
  documentationSelected: boolean;
}): BulkQuoteResult {
  const priced = customerUnitPriceInrPerKg({
    adminOverrideInrPerKg: opts.spice.base_price_inr_per_kg,
    agmarknetModalAvgInr: opts.agmarknetModalAvgInr,
    markupPercent: opts.spice.markup_percent,
  });
  if (!priced) {
    return {
      pricingAvailable: false,
      spiceId: opts.spice.spice_id,
      spiceName: opts.spice.spice_name,
      message: "Contact us for pricing",
    };
  }

  const shippingRate =
    opts.destination === "UK"
      ? opts.spice.shipping_rate_inr_per_kg_uk
      : opts.spice.shipping_rate_inr_per_kg_eu;
  const spiceCostInr = priced.unit * opts.qtyKg;
  const shippingCostInr = shippingRate * opts.qtyKg;
  const clearanceChargeInr = opts.spice.clearance_charge_inr;
  const testingChargeInr = opts.spice.testing_charge_inr;
  const subtotalInr = spiceCostInr + shippingCostInr + clearanceChargeInr + testingChargeInr;
  const estimatedGbp = subtotalInr * opts.fxInrGbp;
  const estimatedEur = subtotalInr * opts.fxInrEur;
  const displayCurrency = opts.destination === "UK" ? "GBP" : "EUR";
  const estimatedDisplay = displayCurrency === "GBP" ? estimatedGbp : estimatedEur;
  const sampleFeeDisplay =
    displayCurrency === "GBP" ? opts.addOns.sample_fee_gbp : opts.addOns.sample_fee_eur;
  const documentationFeeDisplay =
    displayCurrency === "GBP"
      ? opts.addOns.documentation_handling_fee_gbp
      : opts.addOns.documentation_handling_fee_eur;
  const addOnsTotalDisplay =
    (opts.sampleSelected ? sampleFeeDisplay : 0) +
    (opts.documentationSelected ? documentationFeeDisplay : 0);

  return {
    pricingAvailable: true,
    spiceId: opts.spice.spice_id,
    spiceName: opts.spice.spice_name,
    qtyKg: opts.qtyKg,
    destination: opts.destination,
    unitPriceInrPerKg: roundQuoteMoney(priced.unit),
    spiceCostInr: roundQuoteMoney(spiceCostInr),
    shippingCostInr: roundQuoteMoney(shippingCostInr),
    clearanceChargeInr: roundQuoteMoney(clearanceChargeInr),
    testingChargeInr: roundQuoteMoney(testingChargeInr),
    subtotalInr: roundQuoteMoney(subtotalInr),
    fxInrGbp: opts.fxInrGbp,
    fxInrEur: opts.fxInrEur,
    estimatedGbp: roundQuoteMoney(estimatedGbp),
    estimatedEur: roundQuoteMoney(estimatedEur),
    displayCurrency,
    estimatedDisplay: roundQuoteMoney(estimatedDisplay),
    priceSource: priced.source,
    sampleSelected: opts.sampleSelected,
    documentationSelected: opts.documentationSelected,
    sampleFeeDisplay: roundQuoteMoney(sampleFeeDisplay),
    documentationFeeDisplay: roundQuoteMoney(documentationFeeDisplay),
    addOnsTotalDisplay: roundQuoteMoney(addOnsTotalDisplay),
    grandTotalDisplay: roundQuoteMoney(estimatedDisplay + addOnsTotalDisplay),
  };
}

export function qtyBelowMinimum(qtyKg: number, min = DEFAULT_BULK_MIN_QTY_KG): boolean {
  return !Number.isFinite(qtyKg) || qtyKg < min;
}
