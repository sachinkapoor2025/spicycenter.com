import {
  convertCurrencyAmount,
  roundForCurrency,
  type ShopCurrency,
} from "../currency";
import {
  FLASH_COMBO_SHIPPING_USD,
  isFlashComboProduct,
} from "./flash-sale";
import { cartLineUnitTotal } from "./product-addons";

/** Cart subtotal at or above this (USD) unlocks free shipping. */
export const FREE_SHIPPING_MIN_SUBTOTAL_USD = 49;

/**
 * Paid shipping bands (USD). `maxUsd` is exclusive.
 * below $10 → $10; below $20 → $8; below $30 → $6; below $40 → $4; below $49 → $2.
 */
export const SHIPPING_RATE_BANDS = [
  { minUsd: 0, maxUsd: 10, feeUsd: 10 },
  { minUsd: 10, maxUsd: 20, feeUsd: 8 },
  { minUsd: 20, maxUsd: 30, feeUsd: 6 },
  { minUsd: 30, maxUsd: 40, feeUsd: 4 },
  { minUsd: 40, maxUsd: 49, feeUsd: 2 },
] as const;

export type ShippingRateBand = (typeof SHIPPING_RATE_BANDS)[number];

/** Lowest paid fee (cart under $10). Kept for existing imports. */
export const BELOW_THRESHOLD_SHIPPING_USD = SHIPPING_RATE_BANDS[0].feeUsd;

/** Start of the $2 shipping band (cart $40–$48.99). */
export const REDUCED_SHIPPING_MIN_SUBTOTAL_USD = 40;

/** $2 shipping when cart is $40+ but under $49. */
export const REDUCED_SHIPPING_USD = 2;

export type FreeShippingTier = "low" | "mid" | "free";

export type FreeShippingQuote = {
  /** Shipping charged to the customer in `currency`. */
  charge: number;
  qualifiesForFreeShipping: boolean;
  /** How much more cart value (in `currency`) is needed for free shipping. */
  amountAwayFromFreeShipping: number;
  /** How much more cart value (in `currency`) is needed to reach the next cheaper paid band. */
  amountAwayFromReducedShipping: number;
  /** Free-shipping threshold expressed in `currency`. */
  thresholdInCurrency: number;
  /** Next cheaper paid-band minimum, or the $2-band minimum when already there. */
  reducedThresholdInCurrency: number;
  /** Current band fee in `currency` (or $10 band fee when free). */
  lowTierFeeInCurrency: number;
  /** Next cheaper paid fee in `currency` (or $2 when none). */
  midTierFeeInCurrency: number;
  /** Current tier for this bucket. `mid` = $2 band; `low` = any higher paid fee. */
  tier: FreeShippingTier;
  /** Shipping fee for the current bucket tier, in `currency`. */
  belowThresholdFeeInCurrency: number;
};

function toCurrency(
  amountUsd: number,
  currency: ShopCurrency,
  usdInrRate: number
): number {
  if (currency === "USD") return roundForCurrency(amountUsd, "USD");
  return roundForCurrency(
    convertCurrencyAmount(amountUsd, "USD", "INR", usdInrRate),
    "INR"
  );
}

function toUsd(
  amount: number,
  currency: ShopCurrency,
  usdInrRate: number
): number {
  if (currency === "USD") return amount;
  return convertCurrencyAmount(amount, "INR", "USD", usdInrRate);
}

export function shippingBandForSubtotalUsd(
  subtotalUsd: number
): ShippingRateBand | null {
  if (subtotalUsd >= FREE_SHIPPING_MIN_SUBTOTAL_USD) return null;
  return (
    SHIPPING_RATE_BANDS.find((b) => subtotalUsd >= b.minUsd && subtotalUsd < b.maxUsd) ??
    SHIPPING_RATE_BANDS[0]
  );
}

function nextCheaperBand(subtotalUsd: number): ShippingRateBand | null {
  const current = shippingBandForSubtotalUsd(subtotalUsd);
  if (!current) return null;
  const idx = SHIPPING_RATE_BANDS.findIndex((b) => b.minUsd === current.minUsd);
  return idx >= 0 ? SHIPPING_RATE_BANDS[idx + 1] ?? null : null;
}

/**
 * Shipping tiers (per address × vendor bucket, in USD):
 * - under $10 → $10
 * - $10 to under $20 → $8
 * - $20 to under $30 → $6
 * - $30 to under $40 → $4
 * - $40 to under $49 → $2
 * - $49+ → free
 * Evaluated in USD, then converted when the shopper currency is INR.
 */
export function quoteFreeShippingThreshold(input: {
  subtotal: number;
  currency: ShopCurrency;
  usdInrRate: number;
}): FreeShippingQuote {
  const { subtotal, currency, usdInrRate } = input;
  const thresholdInCurrency = toCurrency(
    FREE_SHIPPING_MIN_SUBTOTAL_USD,
    currency,
    usdInrRate
  );
  const subtotalUsd = toUsd(subtotal, currency, usdInrRate);
  const band = shippingBandForSubtotalUsd(subtotalUsd);
  const next = nextCheaperBand(subtotalUsd);

  const lowTierFee = toCurrency(BELOW_THRESHOLD_SHIPPING_USD, currency, usdInrRate);
  const midTierFee = toCurrency(REDUCED_SHIPPING_USD, currency, usdInrRate);

  let charge = 0;
  let qualifiesForFreeShipping = false;
  let tier: FreeShippingTier = "low";

  if (!band) {
    qualifiesForFreeShipping = true;
    tier = "free";
    charge = 0;
  } else {
    charge = toCurrency(band.feeUsd, currency, usdInrRate);
    tier = band.feeUsd === REDUCED_SHIPPING_USD ? "mid" : "low";
  }

  const nextMinUsd = next?.minUsd ?? REDUCED_SHIPPING_MIN_SUBTOTAL_USD;
  const reducedThresholdInCurrency = toCurrency(nextMinUsd, currency, usdInrRate);
  const nextFeeUsd = next?.feeUsd ?? REDUCED_SHIPPING_USD;
  const nextFeeInCurrency = toCurrency(nextFeeUsd, currency, usdInrRate);

  const amountAwayFromFreeShipping = qualifiesForFreeShipping
    ? 0
    : Math.max(0, roundForCurrency(thresholdInCurrency - subtotal, currency));
  const amountAwayFromReducedShipping =
    qualifiesForFreeShipping || !next
      ? 0
      : Math.max(0, roundForCurrency(reducedThresholdInCurrency - subtotal, currency));

  return {
    charge,
    qualifiesForFreeShipping,
    amountAwayFromFreeShipping,
    amountAwayFromReducedShipping,
    thresholdInCurrency,
    reducedThresholdInCurrency,
    lowTierFeeInCurrency: band ? charge : lowTierFee,
    midTierFeeInCurrency: next ? nextFeeInCurrency : midTierFee,
    tier,
    belowThresholdFeeInCurrency: charge,
  };
}

/** Default vendor bucket for catalog SKUs without `vendorSlug` (SpicyCorner). */
export const SHIPPING_VENDOR_SPICYCORNER = "spicycorner";

/** Normalize cart/product vendor for per-vendor free-shipping buckets. */
export function shippingVendorKey(item: { vendorSlug?: string }): string {
  const slug = item.vendorSlug?.trim();
  return slug || SHIPPING_VENDOR_SPICYCORNER;
}

/**
 * Free-shipping groups: each subtotal is one chargeable bucket
 * (delivery address × vendor). Tiers apply per bucket; total = sum.
 */
export function quoteShipmentsShipping(input: {
  shipmentSubtotals: number[];
  currency: ShopCurrency;
  usdInrRate: number;
}): {
  totalCharge: number;
  perShipment: FreeShippingQuote[];
} {
  const perShipment = input.shipmentSubtotals.map((subtotal) =>
    quoteFreeShippingThreshold({
      subtotal,
      currency: input.currency,
      usdInrRate: input.usdInrRate,
    })
  );
  const totalCharge = roundForCurrency(
    perShipment.reduce((sum, q) => sum + q.charge, 0),
    input.currency
  );
  return { totalCharge, perShipment };
}

/** Subtotals keyed by vendor within one delivery address (includes add-ons). */
export function vendorSubtotalsForItems(
  items: Array<{
    price: number;
    quantity: number;
    vendorSlug?: string;
    addons?: Array<{ price: number; quantity: number }>;
  }>
): number[] {
  const byVendor = new Map<string, number>();
  for (const item of items) {
    const key = shippingVendorKey(item);
    byVendor.set(
      key,
      (byVendor.get(key) ?? 0) + cartLineUnitTotal(item) * item.quantity
    );
  }
  return [...byVendor.values()];
}

function flashComboShippingQuote(
  currency: ShopCurrency,
  usdInrRate: number
): FreeShippingQuote {
  const charge = toCurrency(FLASH_COMBO_SHIPPING_USD, currency, usdInrRate);
  const thresholdInCurrency = toCurrency(
    FREE_SHIPPING_MIN_SUBTOTAL_USD,
    currency,
    usdInrRate
  );
  const reducedThresholdInCurrency = toCurrency(
    REDUCED_SHIPPING_MIN_SUBTOTAL_USD,
    currency,
    usdInrRate
  );
  return {
    charge,
    qualifiesForFreeShipping: false,
    amountAwayFromFreeShipping: 0,
    amountAwayFromReducedShipping: 0,
    thresholdInCurrency,
    reducedThresholdInCurrency,
    lowTierFeeInCurrency: toCurrency(BELOW_THRESHOLD_SHIPPING_USD, currency, usdInrRate),
    midTierFeeInCurrency: toCurrency(REDUCED_SHIPPING_USD, currency, usdInrRate),
    tier: "low",
    belowThresholdFeeInCurrency: charge,
  };
}

/**
 * Shipping for one delivery address: evaluate tiers per vendor inside that
 * address (SpicyCorner vs Orange County, etc.), then sum.
 * Flash-combo-only buckets use a flat $1 shipping fee.
 */
export function quoteAddressShipmentShipping(input: {
  items: Array<{
    price: number;
    quantity: number;
    vendorSlug?: string;
    productSlug?: string;
    addons?: Array<{ price: number; quantity: number }>;
  }>;
  currency: ShopCurrency;
  usdInrRate: number;
}): {
  totalCharge: number;
  perVendor: FreeShippingQuote[];
} {
  const byVendor = new Map<
    string,
    Array<{
      price: number;
      quantity: number;
      productSlug?: string;
      addons?: Array<{ price: number; quantity: number }>;
    }>
  >();
  for (const item of input.items) {
    const key = shippingVendorKey(item);
    const list = byVendor.get(key) ?? [];
    list.push(item);
    byVendor.set(key, list);
  }

  const perVendor = [...byVendor.values()].map((vendorItems) => {
    const flashOnly =
      vendorItems.length > 0 &&
      vendorItems.every((i) => isFlashComboProduct(i.productSlug));
    if (flashOnly) {
      return flashComboShippingQuote(input.currency, input.usdInrRate);
    }
    // Must include add-ons — otherwise Razorpay totals diverge from checkout UI.
    const subtotal = vendorItems.reduce(
      (sum, i) => sum + cartLineUnitTotal(i) * i.quantity,
      0
    );
    return quoteFreeShippingThreshold({
      subtotal,
      currency: input.currency,
      usdInrRate: input.usdInrRate,
    });
  });

  const totalCharge = roundForCurrency(
    perVendor.reduce((sum, q) => sum + q.charge, 0),
    input.currency
  );
  return { totalCharge, perVendor };
}
