import type {
  AddOnPricing,
  BulkDestination,
  BulkPricingSpice,
  BulkQuoteResult,
  FreightTiersConfig,
  MoistureTreatmentPricing,
} from "../schemas/bulk-pricing";
import { moistureFeeInr, resolvedAdvisoryNote } from "../schemas/bulk-pricing";
import {
  DEFAULT_BULK_MIN_QTY_KG,
  DEFAULT_DESICCANT_FEE_HIGH_INR,
  DEFAULT_DESICCANT_FEE_STANDARD_INR,
} from "./agmarknet-commodities";
import {
  addOnFeesForDestination,
  bulkDisplayCurrency,
  shippingRateInrPerKg,
} from "./bulk-destination";
import { DEFAULT_FREIGHT_TIERS, recommendContainer } from "./freight-tiers";

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

const DEFAULT_MOISTURE: MoistureTreatmentPricing = {
  desiccant_fee_standard_inr: DEFAULT_DESICCANT_FEE_STANDARD_INR,
  desiccant_fee_high_inr: DEFAULT_DESICCANT_FEE_HIGH_INR,
};

export function computeBulkQuote(opts: {
  spice: BulkPricingSpice;
  qtyKg: number;
  destination: BulkDestination;
  agmarknetModalAvgInr?: number | null;
  fxInrGbp: number;
  fxInrEur: number;
  fxInrUsd?: number;
  fxInrCad?: number;
  addOns: AddOnPricing;
  sampleSelected: boolean;
  documentationSelected: boolean;
  moisture?: MoistureTreatmentPricing;
  freightTiers?: FreightTiersConfig;
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

  const spiceForm = opts.spice.spice_form ?? "whole";
  const moistureSensitivity =
    opts.spice.moisture_sensitivity ?? (spiceForm === "ground" ? "high" : "standard");
  const moisturePricing = opts.moisture ?? DEFAULT_MOISTURE;
  const freightTiers = opts.freightTiers ?? DEFAULT_FREIGHT_TIERS;
  const moistureTreatmentInr = moistureFeeInr(moistureSensitivity, moisturePricing);

  const shippingRate = shippingRateInrPerKg(opts.spice, opts.destination);
  const spiceCostInr = priced.unit * opts.qtyKg;
  const shippingCostInr = shippingRate * opts.qtyKg;
  const clearanceChargeInr = opts.spice.clearance_charge_inr;
  const testingChargeInr = opts.spice.testing_charge_inr;
  /** INR goods subtotal before FX — spice, clearance, testing, moisture. Shipping is converted separately. */
  const subtotalInr = spiceCostInr + clearanceChargeInr + testingChargeInr + moistureTreatmentInr;
  const fxInrUsd = opts.fxInrUsd && opts.fxInrUsd > 0 ? opts.fxInrUsd : 0.012;
  const fxInrCad = opts.fxInrCad && opts.fxInrCad > 0 ? opts.fxInrCad : 0.016;
  const estimatedGbp = subtotalInr * opts.fxInrGbp;
  const estimatedEur = subtotalInr * opts.fxInrEur;
  const estimatedUsd = subtotalInr * fxInrUsd;
  const estimatedCad = subtotalInr * fxInrCad;
  const displayCurrency = bulkDisplayCurrency(opts.destination);
  const fx =
    displayCurrency === "GBP"
      ? opts.fxInrGbp
      : displayCurrency === "EUR"
        ? opts.fxInrEur
        : displayCurrency === "CAD"
          ? fxInrCad
          : fxInrUsd;
  const estimatedDisplay =
    displayCurrency === "GBP"
      ? estimatedGbp
      : displayCurrency === "EUR"
        ? estimatedEur
        : displayCurrency === "CAD"
          ? estimatedCad
          : estimatedUsd;
  const shippingCostDisplay = shippingCostInr * fx;
  const addOnFees = addOnFeesForDestination(opts.addOns, opts.destination);
  const sampleFeeDisplay = addOnFees.sample;
  const documentationFeeDisplay = addOnFees.documentation;
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
    shippingCostDisplay: roundQuoteMoney(shippingCostDisplay),
    clearanceChargeInr: roundQuoteMoney(clearanceChargeInr),
    testingChargeInr: roundQuoteMoney(testingChargeInr),
    moistureTreatmentInr: roundQuoteMoney(moistureTreatmentInr),
    subtotalInr: roundQuoteMoney(subtotalInr),
    fxInrGbp: opts.fxInrGbp,
    fxInrEur: opts.fxInrEur,
    fxInrUsd,
    fxInrCad,
    estimatedGbp: roundQuoteMoney(estimatedGbp),
    estimatedEur: roundQuoteMoney(estimatedEur),
    estimatedUsd: roundQuoteMoney(estimatedUsd),
    estimatedCad: roundQuoteMoney(estimatedCad),
    displayCurrency,
    estimatedDisplay: roundQuoteMoney(estimatedDisplay),
    priceSource: priced.source,
    sampleSelected: opts.sampleSelected,
    documentationSelected: opts.documentationSelected,
    sampleFeeDisplay: roundQuoteMoney(sampleFeeDisplay),
    documentationFeeDisplay: roundQuoteMoney(documentationFeeDisplay),
    addOnsTotalDisplay: roundQuoteMoney(addOnsTotalDisplay),
    grandTotalDisplay: roundQuoteMoney(estimatedDisplay + shippingCostDisplay + addOnsTotalDisplay),
    containerRecommendation: recommendContainer(opts.qtyKg, freightTiers),
    advisoryNote: resolvedAdvisoryNote(opts.spice.spice_name, spiceForm, opts.spice.advisory_note),
    spiceForm,
    moistureSensitivity,
  };
}

export function qtyBelowMinimum(qtyKg: number, min = DEFAULT_BULK_MIN_QTY_KG): boolean {
  return !Number.isFinite(qtyKg) || qtyKg < min;
}
