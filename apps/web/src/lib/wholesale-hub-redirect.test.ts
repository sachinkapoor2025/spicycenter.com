import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enquiryPathFromWholesaleSearch } from "./wholesale-hub-redirect";

describe("enquiryPathFromWholesaleSearch", () => {
  it("redirects the hub to /enquiry with no query", () => {
    assert.equal(enquiryPathFromWholesaleSearch({}), "/enquiry");
  });

  it("forwards product, country, and quantity when present", () => {
    assert.equal(
      enquiryPathFromWholesaleSearch({ product: "Cumin whole", country: "AE", quantity: "25kg" }),
      "/enquiry?product=Cumin+whole&country=AE&quantity=25kg"
    );
  });

  it("drops empty and unrelated query keys", () => {
    assert.equal(
      enquiryPathFromWholesaleSearch({ product: "  ", foo: "bar", country: "IN" }),
      "/enquiry?country=IN"
    );
  });
});
