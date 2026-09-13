import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VENDOR_SPICYCORNER, VENDOR_ORANGE_COUNTY } from "../constants";
import {
  DEFAULT_WAREHOUSES,
  DEFAULT_VENDORS,
  WAREHOUSE_IN_ID,
  WAREHOUSE_UK_ID,
  WAREHOUSE_US_ID,
  assignFulfillment,
  productAvailableInCountry,
  validatePostalCode,
  warehouseServesCountry,
} from "./markets";
import { orderVisibleToActor, productVisibleToActor } from "./vendor-scope";

describe("postal validation", () => {
  it("accepts US ZIP and UK postcode formats", () => {
    assert.equal(validatePostalCode("US", "95112").valid, true);
    assert.equal(validatePostalCode("US", "abc").valid, false);
    assert.equal(validatePostalCode("GB", "SO18 2ED").valid, true);
    assert.equal(validatePostalCode("IN", "152002").valid, true);
    assert.equal(validatePostalCode("IN", "15200").valid, false);
    assert.equal(validatePostalCode("CA", "M5V 2T6").valid, true);
    assert.equal(validatePostalCode("AU", "2000").valid, true);
  });
});

describe("warehouse service areas", () => {
  it("routes US/UK/IN to local warehouses", () => {
    const us = DEFAULT_WAREHOUSES.find((w) => w.warehouseId === WAREHOUSE_US_ID)!;
    const uk = DEFAULT_WAREHOUSES.find((w) => w.warehouseId === WAREHOUSE_UK_ID)!;
    const inn = DEFAULT_WAREHOUSES.find((w) => w.warehouseId === WAREHOUSE_IN_ID)!;
    assert.equal(warehouseServesCountry(us, "US"), true);
    assert.equal(warehouseServesCountry(uk, "GB"), true);
    assert.equal(warehouseServesCountry(uk, "DE"), true);
    assert.equal(warehouseServesCountry(inn, "IN"), true);
    assert.equal(warehouseServesCountry(inn, "US"), false);
  });
});

describe("fulfillment assignment", () => {
  it("prefers same-country warehouse and splits mixed vendors", () => {
    const uk = assignFulfillment({
      items: [{ productSlug: "cumin-seed" }],
      destinationCountry: "GB",
      warehouses: DEFAULT_WAREHOUSES,
      vendors: DEFAULT_VENDORS,
    });
    assert.equal(uk.assignedWarehouseId, WAREHOUSE_UK_ID);
    assert.equal(uk.routingReason, "same_country_inventory");

    const split = assignFulfillment({
      items: [
        { productSlug: "cumin-seed" },
        { productSlug: "hamper", vendorSlug: VENDOR_ORANGE_COUNTY },
      ],
      destinationCountry: "US",
      warehouses: DEFAULT_WAREHOUSES,
      vendors: DEFAULT_VENDORS,
    });
    assert.equal(split.splits?.length, 2);
    assert.equal(split.routingReason, "split_multi_vendor");
  });

  it("uses India warehouse for IN destinations", () => {
    const result = assignFulfillment({
      items: [{ productSlug: "diya" }],
      destinationCountry: "IN",
      warehouses: DEFAULT_WAREHOUSES,
      vendors: DEFAULT_VENDORS,
    });
    assert.equal(result.assignedWarehouseId, WAREHOUSE_IN_ID);
  });
});

describe("vendor isolation helpers", () => {
  const ocActor = {
    email: "oc@vendor.test",
    isAdmin: false,
    isSuperAdmin: false,
    isVendor: true,
    vendorSlug: VENDOR_ORANGE_COUNTY,
  };
  const adminActor = {
    email: "admin@test.com",
    isAdmin: true,
    isSuperAdmin: true,
    isVendor: false,
  };

  it("hides other vendors' orders and products", () => {
    const ocOrder = { items: [{ vendorSlug: VENDOR_ORANGE_COUNTY }] };
    const hrOrder = { items: [{ vendorSlug: VENDOR_SPICYCORNER }] };
    assert.equal(orderVisibleToActor(ocOrder, ocActor), true);
    assert.equal(orderVisibleToActor(hrOrder, ocActor), false);
    assert.equal(orderVisibleToActor(hrOrder, adminActor), true);
    assert.equal(productVisibleToActor({ vendorSlug: VENDOR_ORANGE_COUNTY }, ocActor), true);
    assert.equal(productVisibleToActor({ vendorSlug: VENDOR_SPICYCORNER }, ocActor), false);
  });
});

describe("product country availability", () => {
  it("keeps untagged catalog products visible everywhere", () => {
    assert.equal(
      productAvailableInCountry({ productSlug: "hat", countryCode: "GB" }),
      true
    );
    assert.equal(
      productAvailableInCountry({
        productSlug: "hat",
        countryCode: "GB",
        availableCountryCodes: ["US"],
      }),
      false
    );
  });
});
