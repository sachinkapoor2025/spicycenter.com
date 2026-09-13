import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOrderNumber,
  isHumanOrderNumber,
  orderNumberPrefixForItems,
  orderNumberCounterPrefix,
  displayOrderRef,
  ORDER_NUMBER_START,
} from "./order-number";
import { VENDOR_ORANGE_COUNTY } from "../constants";
import { orderKeys } from "../db/keys";

describe("order-number", () => {
  it("formats OC/HW sequences from 10001", () => {
    assert.equal(formatOrderNumber("OC", ORDER_NUMBER_START), "OC10001");
    assert.equal(formatOrderNumber("HW", 10042), "HW10042");
  });

  it("detects human order numbers including legacy US", () => {
    assert.equal(isHumanOrderNumber("OC10001"), true);
    assert.equal(isHumanOrderNumber("HW10999"), true);
    assert.equal(isHumanOrderNumber("US10007"), true);
    assert.equal(isHumanOrderNumber("449cd53d-8a7e-4494-9479-b3c342380828"), false);
  });

  it("picks OC prefix when cart has orange-county lines", () => {
    assert.equal(
      orderNumberPrefixForItems([{ vendorSlug: VENDOR_ORANGE_COUNTY }]),
      "OC"
    );
    assert.equal(orderNumberPrefixForItems([{ vendorSlug: undefined }]), "HW");
  });

  it("reuses the US counter key for HW so sequences continue", () => {
    assert.equal(orderNumberCounterPrefix("HW"), "US");
    assert.equal(orderKeys.counterPk("HW"), "COUNTER#ORDER#US");
    assert.equal(orderKeys.counterPk("US"), "COUNTER#ORDER#US");
    assert.equal(orderKeys.counterPk("OC"), "COUNTER#ORDER#OC");
  });

  it("prefers orderNumber for display", () => {
    assert.equal(
      displayOrderRef({ orderId: "uuid-here-long", orderNumber: "OC10007" }),
      "OC10007"
    );
  });
});
