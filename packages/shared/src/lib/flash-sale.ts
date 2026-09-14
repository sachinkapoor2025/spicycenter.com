/** Flash combo platform hooks — SpicyCenter has no active usarakhi flash SKU. */

export const FLASH_COMBO_SALE_SLUG = "blue-beads-om-pista-flash-combo";

/** Inclusive start of the sale window (UTC). 24h from this instant. */
export const FLASH_COMBO_SALE_STARTED_AT = "2026-08-03T20:17:00.000Z";

/** Sale length from start. */
export const FLASH_COMBO_SALE_DURATION_MS = 24 * 60 * 60 * 1000;

/** Flat shipping for flash-combo-only vendor buckets (USD). */
export const FLASH_COMBO_SHIPPING_USD = 0.99;

export const FLASH_COMBO_SALE = {
  slug: FLASH_COMBO_SALE_SLUG,
  title: "24-Hour Flash Sale",
  headline: "Grab Your Offer (5 product combo)",
  priceUsd: 12.96,
  compareAtUsd: 24.99,
  shippingUsd: FLASH_COMBO_SHIPPING_USD,
  includes: [
    "spice flash offer item 1",
    "spice flash offer item 2",
    "spice flash offer item 3",
  ],
  /** Canonical gallery — overrides stale Dynamo images on storefront. */
  images: [
    "https://www.spicycenter.com/banners/bannerpage1.png",
    "https://www.spicycenter.com/banners/bannerpage2.png",
  ],
} as const;

export function flashComboSaleEndsAt(): Date {
  return new Date(
    new Date(FLASH_COMBO_SALE_STARTED_AT).getTime() + FLASH_COMBO_SALE_DURATION_MS
  );
}

export function isFlashComboSaleActive(now = new Date()): boolean {
  const start = new Date(FLASH_COMBO_SALE_STARTED_AT).getTime();
  const end = flashComboSaleEndsAt().getTime();
  const t = now.getTime();
  return t >= start && t < end;
}

export function isFlashComboProduct(slug: string | undefined | null): boolean {
  return (slug ?? "").trim() === FLASH_COMBO_SALE_SLUG;
}

/** True when storefront/cart must keep the exact listed price (no competitive cut). */
export function productUsesFixedStorefrontPrice(product: {
  couponExcluded?: boolean;
  tags?: string[];
  slug?: string;
}): boolean {
  if (product.couponExcluded) return true;
  if (isFlashComboProduct(product.slug)) return true;
  const tags = product.tags ?? [];
  return tags.includes("fixed-price") || tags.includes("flash-sale");
}

/** Force flash-combo list price + gallery from code (ignores stale Dynamo data). */
export function withFlashComboStorefrontPricing<
  T extends {
    slug?: string;
    price: number;
    compareAtPrice?: number;
    couponExcluded?: boolean;
    images?: string[];
  }
>(product: T): T {
  if (!isFlashComboProduct(product.slug)) return product;
  return {
    ...product,
    price: FLASH_COMBO_SALE.priceUsd,
    compareAtPrice: Math.max(
      product.compareAtPrice ?? 0,
      FLASH_COMBO_SALE.compareAtUsd
    ),
    images: [...FLASH_COMBO_SALE.images],
    couponExcluded: true,
  };
}

/** Unit price charged for the flash combo (cart / checkout). */
export function flashComboUnitPriceUsd(): number {
  return FLASH_COMBO_SALE.priceUsd;
}

type CouponLine = {
  price: number;
  quantity: number;
  couponExcluded?: boolean;
  productSlug?: string;
  addons?: Array<{ price: number; quantity: number }>;
};

function lineTotal(item: CouponLine): number {
  const addonTotal =
    item.addons?.reduce((sum, a) => sum + a.price * a.quantity, 0) ?? 0;
  return (item.price + addonTotal) * item.quantity;
}

/** Subtotal of cart lines that coupons may discount. */
export function couponEligibleSubtotal(items: CouponLine[]): number {
  return Math.round(
    items.reduce((sum, item) => {
      if (item.couponExcluded || isFlashComboProduct(item.productSlug)) return sum;
      return sum + lineTotal(item);
    }, 0) * 100
  ) / 100;
}

export function cartHasCouponExcludedItems(items: CouponLine[]): boolean {
  return items.some(
    (item) => item.couponExcluded || isFlashComboProduct(item.productSlug)
  );
}
