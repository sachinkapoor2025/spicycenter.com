import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  vendorShipmentUpdateSchema,
  vendorTrackingUpdateSchema,
} from "./vendor-orange-county";

describe("vendorShipmentUpdateSchema", () => {
  it("requires courierName and awb", () => {
    const parsed = vendorShipmentUpdateSchema.safeParse({
      orderNumber: "OC10001",
      courierName: "USPS",
      awb: "9400111899223344556677",
    });
    assert.equal(parsed.success, true);
  });
});

describe("vendorTrackingUpdateSchema", () => {
  it("accepts currentShipmentStatus", () => {
    const parsed = vendorTrackingUpdateSchema.safeParse({
      orderNumber: "OC10001",
      currentShipmentStatus: "in_transit",
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.currentStatus, "in_transit");
    assert.equal(parsed.data.currentShipmentStatus, "in_transit");
  });

  it("accepts currentStatus as alias", () => {
    const parsed = vendorTrackingUpdateSchema.safeParse({
      orderNumber: "OC10001",
      currentStatus: "delivered",
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.currentShipmentStatus, "delivered");
  });

  it("rejects missing status fields", () => {
    const parsed = vendorTrackingUpdateSchema.safeParse({
      orderNumber: "OC10001",
    });
    assert.equal(parsed.success, false);
  });
});
