import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOrderAwaitingPayment,
  isOrderPaymentSettled,
  orderConfirmationHeadline,
} from "./order-status";

describe("isOrderPaymentSettled", () => {
  it("is false for pending_payment and cancelled", () => {
    assert.equal(isOrderPaymentSettled("pending_payment"), false);
    assert.equal(isOrderPaymentSettled("cancelled"), false);
  });

  it("is true for paid and all post-payment fulfillment statuses", () => {
    for (const status of [
      "paid",
      "accepted",
      "on_hold",
      "processing",
      "shipped",
      "delivered",
      "complete",
      "refunded",
    ]) {
      assert.equal(isOrderPaymentSettled(status), true, status);
    }
  });
});

describe("isOrderAwaitingPayment", () => {
  it("only matches pending_payment", () => {
    assert.equal(isOrderAwaitingPayment("pending_payment"), true);
    assert.equal(isOrderAwaitingPayment("shipped"), false);
    assert.equal(isOrderAwaitingPayment("paid"), false);
  });
});

describe("orderConfirmationHeadline", () => {
  it("uses shipped copy instead of awaiting payment", () => {
    assert.match(orderConfirmationHeadline("shipped"), /shipped/i);
    assert.match(orderConfirmationHeadline("pending_payment"), /Awaiting payment/i);
    assert.match(orderConfirmationHeadline("accepted"), /confirmed/i);
  });
});
