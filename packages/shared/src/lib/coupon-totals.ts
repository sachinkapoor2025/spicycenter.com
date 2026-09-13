import { DEFAULT_USD_INR_RATE, roundForCurrency, type ShopCurrency } from "../currency";
import {
  TEST_ORDER_COUPON_KIND,
  TEST_ORDER_FORCE_TOTAL_USD,
  type CouponKind,
} from "../schemas/coupon";

/** Checkout total charged when a test-order coupon is applied ($1 USD, or INR equivalent). */
export function testOrderForceTotal(currency: ShopCurrency, usdInrRate = 0): number {
  if (currency === "INR") {
    const rate = usdInrRate > 0 ? usdInrRate : DEFAULT_USD_INR_RATE;
    return roundForCurrency(TEST_ORDER_FORCE_TOTAL_USD * rate, "INR");
  }
  return TEST_ORDER_FORCE_TOTAL_USD;
}

export function applyCouponToOrderTotals(input: {
  kind?: CouponKind | string;
  discountPercent?: number;
  eligibleSubtotal: number;
  subtotal: number;
  shipping: number;
  tax?: number;
  currency: ShopCurrency;
  usdInrRate?: number;
}): { discount: number; total: number } {
  const tax = input.tax ?? 0;
  const currency = input.currency;
  const gross = roundForCurrency(input.subtotal + input.shipping + tax, currency);

  if (input.kind === TEST_ORDER_COUPON_KIND) {
    const total = testOrderForceTotal(currency, input.usdInrRate ?? 0);
    return {
      discount: roundForCurrency(gross - total, currency),
      total,
    };
  }

  const discount = roundForCurrency(
    input.eligibleSubtotal * ((input.discountPercent ?? 0) / 100),
    currency
  );
  return {
    discount,
    total: Math.max(0, roundForCurrency(input.subtotal - discount + input.shipping + tax, currency)),
  };
}
