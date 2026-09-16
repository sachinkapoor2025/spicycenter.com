import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeBulkQuote, customerUnitPriceInrPerKg, mandiQuintalToInrPerKg } from "./bulk-quote";
import type { AddOnPricing, BulkPricingSpice } from "../schemas/bulk-pricing";

const spice: BulkPricingSpice = {
  spice_id: "cumin",
  spice_name: "Cumin",
  base_price_inr_per_kg: null,
  markup_percent: 10,
  shipping_rate_inr_per_kg_uk: 750,
  shipping_rate_inr_per_kg_eu: 800,
  clearance_charge_inr: 15000,
  testing_charge_inr: 6000,
  min_bulk_qty_kg: 100,
  needsChaQuoteConfirmation: true,
};

const addOns: AddOnPricing = {
  sample_fee_gbp: 9,
  sample_fee_eur: 11,
  documentation_handling_fee_gbp: 29,
  documentation_handling_fee_eur: 34,
};

describe("customerUnitPriceInrPerKg", () => {
  it("never returns the raw mandi price when markup applies", () => {
    const priced = customerUnitPriceInrPerKg({
      adminOverrideInrPerKg: null,
      agmarknetModalAvgInr: 100,
      markupPercent: 10,
    });
    assert.equal(priced?.unit, 110);
    assert.equal(priced?.source, "agmarknet_markup");
  });

  it("prefers admin override", () => {
    const priced = customerUnitPriceInrPerKg({
      adminOverrideInrPerKg: 250,
      agmarknetModalAvgInr: 100,
      markupPercent: 10,
    });
    assert.equal(priced?.unit, 250);
  });

  it("returns null when no data", () => {
    assert.equal(
      customerUnitPriceInrPerKg({
        adminOverrideInrPerKg: null,
        agmarknetModalAvgInr: null,
        markupPercent: 10,
      }),
      null
    );
  });
});

describe("mandiQuintalToInrPerKg", () => {
  it("converts a quintal print to per-kg", () => {
    assert.equal(mandiQuintalToInrPerKg(10425), 104.25);
  });
});

describe("computeBulkQuote", () => {
  it("itemises INR and converts with cached FX", () => {
    const q = computeBulkQuote({
      spice,
      qtyKg: 100,
      destination: "UK",
      agmarknetModalAvgInr: 200,
      fxInrGbp: 0.01,
      fxInrEur: 0.011,
      addOns,
      sampleSelected: true,
      documentationSelected: false,
    });
    assert.equal(q.pricingAvailable, true);
    if (!q.pricingAvailable) return;
    assert.equal(q.unitPriceInrPerKg, 220);
    assert.equal(q.spiceCostInr, 22000);
    assert.equal(q.shippingCostInr, 75000);
    assert.equal(q.clearanceChargeInr, 15000);
    assert.equal(q.testingChargeInr, 6000);
    assert.equal(q.subtotalInr, 118000);
    assert.equal(q.estimatedGbp, 1180);
    assert.equal(q.addOnsTotalDisplay, 9);
    assert.equal(q.grandTotalDisplay, 1189);
  });

  it("scales spice and shipping with quantity; clearance and testing stay fixed", () => {
    const q = computeBulkQuote({
      spice,
      qtyKg: 5000,
      destination: "UK",
      agmarknetModalAvgInr: 200,
      fxInrGbp: 0.01,
      fxInrEur: 0.011,
      addOns,
      sampleSelected: false,
      documentationSelected: false,
    });
    assert.equal(q.pricingAvailable, true);
    if (!q.pricingAvailable) return;
    assert.equal(q.qtyKg, 5000);
    assert.equal(q.unitPriceInrPerKg, 220);
    assert.equal(q.spiceCostInr, 1_100_000);
    assert.equal(q.shippingCostInr, 3_750_000);
    assert.equal(q.clearanceChargeInr, 15000);
    assert.equal(q.testingChargeInr, 6000);
  });

  it("adds sample and documentation fees into the running total", () => {
    const q = computeBulkQuote({
      spice,
      qtyKg: 100,
      destination: "UK",
      agmarknetModalAvgInr: 200,
      fxInrGbp: 0.01,
      fxInrEur: 0.011,
      addOns,
      sampleSelected: true,
      documentationSelected: true,
    });
    assert.equal(q.pricingAvailable, true);
    if (!q.pricingAvailable) return;
    assert.equal(q.addOnsTotalDisplay, 38);
    assert.equal(q.grandTotalDisplay, 1218);
  });

  it("shows contact-us when both sources missing", () => {
    const q = computeBulkQuote({
      spice,
      qtyKg: 100,
      destination: "UK",
      agmarknetModalAvgInr: null,
      fxInrGbp: 0.01,
      fxInrEur: 0.011,
      addOns,
      sampleSelected: false,
      documentationSelected: false,
    });
    assert.equal(q.pricingAvailable, false);
  });
});
