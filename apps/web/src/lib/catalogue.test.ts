import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogueDescription } from "./catalogue";

describe("catalogueDescription", () => {
  it("keeps form and strips pack size from generated catalogue copy", () => {
    const cleaned = catalogueDescription(
      "Warm, earthy seed spice central to Indian tadka, rice, and masalas. Form: whole. Pack: 10kg. Minimum bulk order 10kg. Selling price is a draft placeholder, not an Indian market reference price."
    );
    assert.match(cleaned, /Form: whole/);
    assert.doesNotMatch(cleaned, /Pack:/i);
    assert.doesNotMatch(cleaned, /10kg/i);
  });

  it("strips other pack sizes while keeping the product sentence", () => {
    const cleaned = catalogueDescription(
      "Rhizome sold as dried fingers or powder. Form: powder. Pack: 100g. Retail pack."
    );
    assert.match(cleaned, /Form: powder/);
    assert.doesNotMatch(cleaned, /Pack:/i);
    assert.doesNotMatch(cleaned, /100g/i);
  });
});
