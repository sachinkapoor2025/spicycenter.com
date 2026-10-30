import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENQUIRY_KINDS, ENQUIRY_MARKETS } from "@spicycorner/shared";
import { orderedCountryDialCodes } from "./country-codes";
import {
  enquiryDestinationChoices,
  enquiryDestinationFromChoice,
  filterEnquiryDestinations,
  resolveEnquiryDestination,
  splitEnquiryContactName,
} from "./enquiry-destination";

describe("enquiry destination", () => {
  it("uses the complete project country list, including India", () => {
    const choices = enquiryDestinationChoices();
    assert.equal(choices.length, orderedCountryDialCodes().length);
    assert.equal(choices.some((row) => row.iso === "IN" && row.name === "India"), true);
    assert.equal(choices.length > 100, true);
  });

  it("maps India to the India market and every other country to overseas", () => {
    assert.deepEqual(enquiryDestinationFromChoice({ iso: "IN", name: "India" }), {
      market: ENQUIRY_MARKETS.INDIA,
      country: "",
      label: "India",
      iso: "IN",
    });
    assert.deepEqual(enquiryDestinationFromChoice({ iso: "GB", name: "United Kingdom" }), {
      market: ENQUIRY_MARKETS.OVERSEAS,
      country: "United Kingdom",
      label: "United Kingdom",
      iso: "GB",
    });
  });

  it("resolves country and destination prefill without shortening the stored name", () => {
    assert.equal(resolveEnquiryDestination("IN").market, ENQUIRY_MARKETS.INDIA);
    assert.equal(resolveEnquiryDestination("India").country, "");
    assert.equal(resolveEnquiryDestination("GB").country, "United Kingdom");
    assert.equal(resolveEnquiryDestination("UK").country, "United Kingdom");
    assert.equal(resolveEnquiryDestination("").market, "");
    const matches = filterEnquiryDestinations("united");
    assert.equal(matches.some((row) => row.name === "United Kingdom"), true);
    assert.equal(matches.some((row) => row.name === "United Arab Emirates"), true);
    assert.equal(filterEnquiryDestinations("zz").length, 0);
  });
});

describe("enquiry contact name", () => {
  it("splits a full name into the existing first and last name fields", () => {
    assert.deepEqual(splitEnquiryContactName("  Priya   Shah  "), { firstName: "Priya", lastName: "Shah" });
    assert.deepEqual(splitEnquiryContactName("Priya Kumar Shah"), { firstName: "Priya", lastName: "Kumar Shah" });
    assert.deepEqual(splitEnquiryContactName("Priya"), { firstName: "Priya", lastName: "" });
    assert.deepEqual(splitEnquiryContactName("   "), { firstName: "", lastName: "" });
  });
});

describe("visible enquiry type ids stay on the existing enum", () => {
  it("keeps the internal values used by validation and email", () => {
    assert.equal(ENQUIRY_KINDS.COMMERCIAL_ORDER, "commercial-order");
    assert.equal(ENQUIRY_KINDS.SAMPLE_REQUEST, "sample-request");
    assert.equal(ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY, "simple-product-enquiry");
  });
});
