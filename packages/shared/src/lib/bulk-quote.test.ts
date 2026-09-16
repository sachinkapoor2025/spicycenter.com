import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeBulkQuote, customerUnitPriceInrPerKg, mandiQuintalToInrPerKg } from "./bulk-quote";
import { recommendContainer } from "./freight-tiers";
import { defaultAdvisoryNote, resolvedAdvisoryNote, type AddOnPricing, type BulkPricingSpice } from "../schemas/bulk-pricing";

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
  spice_form: "whole",
  moisture_sensitivity: "standard",
  advisory_note: "",
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

describe("recommendContainer", () => {
  it("uses LCL groupage below the FCL breakpoint", () => {
    const rec = recommendContainer(100);
    assert.equal(rec.tier, "LCL");
    assert.equal(rec.containerCount, 0);
    assert.match(rec.label, /Shared container \(LCL \/ groupage\)/);
  });

  it("recommends a single 20ft dry container within ~22t payload", () => {
    const rec = recommendContainer(18_000);
    assert.equal(rec.tier, "FCL");
    assert.equal(rec.sizeFt, 20);
    assert.equal(rec.containerCount, 1);
    assert.equal(rec.label, "1 × 20ft Standard Dry Container");
    assert.match(rec.explanation, /22-tonne/);
  });

  it("recommends a single 40ft dry container when over 20ft payload", () => {
    const rec = recommendContainer(24_000);
    assert.equal(rec.tier, "FCL");
    assert.equal(rec.sizeFt, 40);
    assert.equal(rec.containerCount, 1);
    assert.equal(rec.label, "1 × 40ft Standard Dry Container");
  });

  it("recommends two 20ft dry containers when that uses fewer unused tonnes than 40fts", () => {
    const rec = recommendContainer(30_000);
    assert.equal(rec.tier, "FCL");
    assert.equal(rec.sizeFt, 20);
    assert.equal(rec.containerCount, 2);
    assert.equal(rec.label, "2 × 20ft Standard Dry Containers");
  });

  it("recommends multiple 40ft dry containers when that needs fewer boxes", () => {
    const rec = recommendContainer(50_000);
    assert.equal(rec.tier, "FCL");
    assert.equal(rec.sizeFt, 40);
    assert.equal(rec.containerCount, 2);
    assert.equal(rec.label, "2 × 40ft Standard Dry Containers");
  });
});

describe("computeBulkQuote", () => {
  it("itemises INR goods, moisture, then converts before adding shipping", () => {
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
    assert.equal(q.moistureTreatmentInr, 2000);
    assert.equal(q.subtotalInr, 45000);
    assert.equal(q.estimatedGbp, 450);
    assert.equal(q.shippingCostDisplay, 750);
    assert.equal(q.addOnsTotalDisplay, 9);
    assert.equal(q.grandTotalDisplay, 1209);
    assert.equal(q.containerRecommendation.tier, "LCL");
    assert.match(q.advisoryNote, /Cumin is shipped whole/);
  });

  it("charges the high desiccant fee for ground / high-sensitivity spices", () => {
    const q = computeBulkQuote({
      spice: { ...spice, spice_form: "ground", moisture_sensitivity: "high", advisory_note: "" },
      qtyKg: 100,
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
    assert.equal(q.moistureTreatmentInr, 4000);
    assert.equal(q.subtotalInr, 47000);
    assert.match(q.advisoryNote, /moisture-sensitive and prone to clumping/);
  });

  it("keeps a custom advisory note when admin has written copy", () => {
    const q = computeBulkQuote({
      spice: { ...spice, advisory_note: "Keep turmeric bags off the container floor." },
      qtyKg: 100,
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
    assert.equal(q.advisoryNote, "Keep turmeric bags off the container floor.");
  });

  it("scales spice and shipping with quantity; clearance, testing and moisture stay fixed", () => {
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
    assert.equal(q.moistureTreatmentInr, 2000);
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
    assert.equal(q.grandTotalDisplay, 1238);
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

describe("defaultAdvisoryNote", () => {
  it("fills whole vs ground copy when admin has not customised", () => {
    assert.match(defaultAdvisoryNote("Turmeric", "whole"), /shipped whole/);
    assert.match(defaultAdvisoryNote("Turmeric", "ground"), /moisture-sensitive/);
    assert.equal(resolvedAdvisoryNote("Turmeric", "whole", "  "), defaultAdvisoryNote("Turmeric", "whole"));
  });
});
