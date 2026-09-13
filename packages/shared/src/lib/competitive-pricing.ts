import { roundForCurrency, type ShopCurrency } from "../currency";
import { GIFT_SETS_CATEGORY_SLUG } from "../constants";
import {
  productUsesFixedStorefrontPrice,
  withFlashComboStorefrontPricing,
} from "./flash-sale";

/**
 * Competitive storefront price cuts (applied to catalog selling price before FX).
 * Same % applies in USD and INR because conversion happens after this reduction.
 *
 * - under $25 → 8% off
 * - $25–$29.99 → 10% off
 * - $30+ → 12% off
 */
export function getCompetitiveDiscountPercent(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (price < 25) return 8;
  if (price < 30) return 10;
  return 12;
}

/** Reduce a catalog price by the competitive tier %; rounds for the currency. */
export function applyCompetitivePriceReduction(
  price: number,
  currency: ShopCurrency = "USD"
): number {
  const percent = getCompetitiveDiscountPercent(price);
  if (percent <= 0) return roundForCurrency(price, currency);
  return roundForCurrency(price * (1 - percent / 100), currency);
}

type Priced = {
  price: number;
  compareAtPrice?: number;
  currency?: ShopCurrency;
  /** Set after competitive pricing runs — makes this helper idempotent across API/catalog paths. */
  storefrontPricingApplied?: boolean;
};

/**
 * Storefront view of a product: lower selling price + keep/raise compare-at
 * so the original catalog price still shows as strikethrough.
 * Does not mutate DynamoDB — admin continues to see stored prices.
 */
type VendorPriced = Priced & {
  vendorSlug?: string;
  categorySlug?: string;
  couponExcluded?: boolean;
  tags?: string[];
  slug?: string;
};

/**
 * Storefront view of a product: lower selling price + keep/raise compare-at
 * so the original catalog price still shows as strikethrough.
 * Vendor-priced products (e.g. Orange County hampers) keep their sale/list prices as stored.
 * Safe to call more than once — never stacks competitive cuts.
 */
export function withCompetitiveStorefrontPricing<T extends VendorPriced>(product: T): T {
  // Flash combo price is owned by code — never show a stale Dynamo $3.99.
  const priced = withFlashComboStorefrontPricing(product);
  // Already has intentional list vs sale pricing from the vendor catalog.
  if (
    priced.vendorSlug ||
    priced.categorySlug === "rakhi-hampers" ||
    priced.categorySlug === GIFT_SETS_CATEGORY_SLUG
  ) {
    return priced;
  }
  // Flash / fixed-price deals must stay at the exact listed price.
  if (productUsesFixedStorefrontPrice(priced)) {
    return { ...priced, storefrontPricingApplied: true };
  }
  product = priced;
  if (product.storefrontPricingApplied) return product;

  const currency = product.currency ?? "USD";
  const original = product.price;
  const reduced = applyCompetitivePriceReduction(original, currency);
  if (reduced >= original) {
    return { ...product, storefrontPricingApplied: true };
  }

  const compareAtPrice = Math.max(product.compareAtPrice ?? 0, original);
  return {
    ...product,
    price: reduced,
    compareAtPrice,
    storefrontPricingApplied: true,
  };
}
