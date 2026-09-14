import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VENDOR_ORANGE_COUNTY, VENDOR_SPICYCORNER } from "../constants";
import {
  allVendorsHaveTracking,
  ensureVendorFulfillments,
  isMultiVendorOrder,
  orderVendorKeys,
  upsertVendorFulfillment,
} from "./order-vendors";

describe("order-vendors", () => {
  it("detects mixed OC + SpicyCenter carts", () => {
    const order = {
      items: [
        { vendorSlug: VENDOR_ORANGE_COUNTY },
        { name: "plain" },
      ],
    };
    assert.deepEqual(orderVendorKeys(order), [VENDOR_ORANGE_COUNTY, VENDOR_SPICYCORNER]);
    assert.equal(isMultiVendorOrder(order), true);
  });

  it("backfills legacy tracking onto sole vendor", () => {
    const rows = ensureVendorFulfillments({
      items: [{ vendorSlug: VENDOR_ORANGE_COUNTY }],
      trackingNumber: "AWB1",
      carrier: "UPS",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.trackingNumber, "AWB1");
    assert.equal(rows[0]?.carrier, "UPS");
  });

  it("requires all vendors for full ship", () => {
    let rows = ensureVendorFulfillments({
      items: [{ vendorSlug: VENDOR_ORANGE_COUNTY }, {}],
    });
    rows = upsertVendorFulfillment(rows, {
      vendorSlug: VENDOR_ORANGE_COUNTY,
      trackingNumber: "OC-1",
    });
    assert.equal(allVendorsHaveTracking(rows), false);
    rows = upsertVendorFulfillment(rows, {
      vendorSlug: VENDOR_SPICYCORNER,
      trackingNumber: "US-1",
    });
    assert.equal(allVendorsHaveTracking(rows), true);
  });
});
