import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAvailableProductsForCountry,
  isProductAvailableForCountry,
  isQuoteableStorefrontCountry,
} from "./shipping-availability";

describe("shipping availability", () => {
  it("treats the five storefront freight countries as quoteable, not guaranteed", () => {
    assert.equal(isQuoteableStorefrontCountry("us"), true);
    assert.equal(isQuoteableStorefrontCountry("GB"), true);
    assert.equal(isQuoteableStorefrontCountry("JP"), false);
    assert.equal(isProductAvailableForCountry({}, "US"), "quoteable");
    assert.equal(isProductAvailableForCountry({}, "JP"), "unknown");
  });

  it("honors an explicit country allow-list", () => {
    const product = { availableCountryCodes: ["US", "CA"] };
    assert.equal(isProductAvailableForCountry(product, "US"), "available");
    assert.equal(isProductAvailableForCountry(product, "GB"), "unavailable");
  });

  it("marks out-of-stock items unavailable", () => {
    assert.equal(isProductAvailableForCountry({ inventory: 0 }, "US"), "unavailable");
  });

  it("filters catalog lists without inventing worldwide shipping", () => {
    const products = [
      { sku: "a", availableCountryCodes: ["US"] },
      { sku: "b" },
      { sku: "c", inventory: 0 },
    ];
    assert.deepEqual(
      getAvailableProductsForCountry(products, "US").map((p) => p.sku),
      ["a", "b"]
    );
    assert.deepEqual(
      getAvailableProductsForCountry(products, "FR").map((p) => p.sku),
      []
    );
  });
});
