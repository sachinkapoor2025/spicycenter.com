import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DISPLAY_CURRENCIES,
  PREFERRED_DISPLAY_CURRENCIES,
  convertCurrency,
  displayCurrencyForCountry,
} from "./currency-display";

describe("displayCurrencyForCountry", () => {
  it("maps preferred countries to their currencies", () => {
    assert.equal(displayCurrencyForCountry("US"), "USD");
    assert.equal(displayCurrencyForCountry("GB"), "GBP");
    assert.equal(displayCurrencyForCountry("CA"), "CAD");
    assert.equal(displayCurrencyForCountry("AU"), "AUD");
    assert.equal(displayCurrencyForCountry("AE"), "AED");
    assert.equal(displayCurrencyForCountry("IN"), "INR");
    assert.equal(displayCurrencyForCountry("DE"), "EUR");
    assert.equal(displayCurrencyForCountry("FR"), "EUR");
  });

  it("defaults unknown countries to USD", () => {
    assert.equal(displayCurrencyForCountry("ZZ"), "USD");
    assert.equal(displayCurrencyForCountry(""), "USD");
  });
});

describe("display currency order", () => {
  it("lists USD UK CAN AUS UAE EUR IND first", () => {
    assert.deepEqual([...PREFERRED_DISPLAY_CURRENCIES], ["USD", "GBP", "CAD", "AUD", "AED", "EUR", "INR"]);
    assert.deepEqual([...DISPLAY_CURRENCIES].slice(0, 7), [...PREFERRED_DISPLAY_CURRENCIES]);
  });
});

describe("convertCurrency", () => {
  it("keeps legacy USD→INR number rates", () => {
    assert.equal(convertCurrency(10, "USD", "INR", 96), 960);
  });

  it("converts USD to GBP from a rate map", () => {
    assert.equal(convertCurrency(20, "USD", "GBP", { USD: 1, GBP: 0.75 }), 15);
  });
});
