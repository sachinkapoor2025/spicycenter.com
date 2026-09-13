import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TEST_ORDER_COUPON_KIND, TEST_ORDER_FORCE_TOTAL_USD } from "../schemas/coupon";
import { applyCouponToOrderTotals, testOrderForceTotal } from "./coupon-totals";

describe("test-order coupon totals", () => {
  it("forces items plus shipping to $1 USD", () => {
    const result = applyCouponToOrderTotals({
      kind: TEST_ORDER_COUPON_KIND,
      eligibleSubtotal: 199,
      subtotal: 199,
      shipping: 12.5,
      currency: "USD",
    });
    assert.equal(result.total, TEST_ORDER_FORCE_TOTAL_USD);
    assert.equal(result.discount, 210.5);
  });

  it("still charges $1 when the cart is already under $1", () => {
    const result = applyCouponToOrderTotals({
      kind: TEST_ORDER_COUPON_KIND,
      eligibleSubtotal: 0.4,
      subtotal: 0.4,
      shipping: 0,
      currency: "USD",
    });
    assert.equal(result.total, 1);
    assert.equal(result.discount, -0.6);
  });

  it("converts the $1 cap to whole rupees", () => {
    assert.equal(testOrderForceTotal("INR", 96), 96);
    const result = applyCouponToOrderTotals({
      kind: TEST_ORDER_COUPON_KIND,
      eligibleSubtotal: 5000,
      subtotal: 5000,
      shipping: 200,
      currency: "INR",
      usdInrRate: 96,
    });
    assert.equal(result.total, 96);
    assert.equal(result.discount, 5104);
  });

  it("keeps percent coupons on eligible items only (shipping stays)", () => {
    const result = applyCouponToOrderTotals({
      kind: "percent",
      discountPercent: 10,
      eligibleSubtotal: 100,
      subtotal: 100,
      shipping: 15,
      currency: "USD",
    });
    assert.equal(result.discount, 10);
    assert.equal(result.total, 105);
  });
});
