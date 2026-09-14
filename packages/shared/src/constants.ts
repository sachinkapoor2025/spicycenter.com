export const ORDER_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  ACCEPTED: "accepted",
  /** Paid order paused for review (fraud, underpricing, stock, etc.). */
  ON_HOLD: "on_hold",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  COMPLETE: "complete",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

/** Allowed next statuses an admin can move an order to from its current status. */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.ON_HOLD,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.COMPLETE,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDED,
  ],
  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.ON_HOLD,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.COMPLETE,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDED,
  ],
  [ORDER_STATUS.ON_HOLD]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDED,
  ],
  [ORDER_STATUS.PROCESSING]: [
    ORDER_STATUS.ON_HOLD,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.COMPLETE,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.REFUNDED,
  ],
  [ORDER_STATUS.SHIPPED]: [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.COMPLETE,
    ORDER_STATUS.REFUNDED,
  ],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETE, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.COMPLETE]: [ORDER_STATUS.REFUNDED],
  /** Admin can revive a cancelled (non-refunded) order for fulfillment. */
  [ORDER_STATUS.CANCELLED]: [
    ORDER_STATUS.ON_HOLD,
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PROCESSING,
  ],
  [ORDER_STATUS.REFUNDED]: [],
};

export const EVENT_TYPES = {
  PAGE_VIEW: "page_view",
  PRODUCT_VIEW: "product_view",
  /** Listing card entered the viewport (prefer rollup-only writes). */
  PRODUCT_IMPRESSION: "product_impression",
  /** Listing card click through to PDP. */
  PRODUCT_CLICK: "product_click",
  SEARCH: "search",
  CART_ADD: "cart_add",
  CART_REMOVE: "cart_remove",
  CHECKOUT_START: "checkout_start",
  PURCHASE: "purchase",
  /** Time spent on a page before leave/navigation (metadata.durationMs). */
  SESSION_PING: "session_ping",
  COUNTRY_CHANGED: "country_changed",
  POSTAL_CODE_ENTERED: "postal_code_entered",
  CHAT_OPEN: "chat_open",
  CHAT_CLOSE: "chat_close",
  CHAT_MESSAGE: "chat_message",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/** Raw analytics events expire after this many days (TTL); rollups are kept. */
export const EVENT_TTL_DAYS = 90;

export const USER_ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
  SUPER_ADMIN: "super-admin",
  VENDOR: "vendor",
} as const;

export const PAYMENT_REGIONS = {
  US: "US",
  IN: "IN",
} as const;

export const PAYMENT_PROVIDERS = {
  STRIPE: "stripe",
  RAZORPAY: "razorpay",
} as const;

/** Default stock when creating products or seeding catalog. */
export const DEFAULT_PRODUCT_INVENTORY = 200;

/** Stock for Orange County hamper imports (keep cart-ready). */
export const ORANGE_COUNTY_PRODUCT_INVENTORY = 500;

/**
 * Backend-only vendor key for hamper fulfillment API / order tagging.
 * Internal vendor stub — not shown on the SpicyCenter storefront.
 */
export const VENDOR_ORANGE_COUNTY = "orange-county" as const;

/** Default SpicyCenter fulfillment key (catalog lines without product.vendorSlug). */
export const VENDOR_SPICYCORNER = "spicycorner" as const;

/** CJ Dropshipping catalog + fulfillment vendor. */
export const VENDOR_CJ_DROPSHIPPING = "cj-dropshipping" as const;

/** Eprolo dropshipping catalog + fulfillment vendor. */
export const VENDOR_EPROLO = "eprolo" as const;

/** Internal OC category slug stub (not used on SpicyCenter storefront). */
export const ORANGE_COUNTY_CATEGORY_SLUG = "rakhi-hampers" as const;

/** Curated spice gift hampers (fixed-price bundles). */
export const GIFT_SETS_CATEGORY_SLUG = "gift-sets" as const;

/**
 * Hamper pricing from vendor cost (Excel). Uses retail margin on selling price:
 *   sale price = cost × 2.0  → 50% margin before coupons  ((P−C)/P)
 *   list/compare-at = cost × 2.5 → sale badge (~20% off list)
 *
 * After spin-the-wheel 6–10% off sale price, net margin stays ~44–47%
 * (≈40–44%+ band at the higher discount end).
 */
export const ORANGE_COUNTY_LIST_MARKUP = 2.5;
export const ORANGE_COUNTY_SALE_MARKUP = 2.0;

/** Email restock alert when inventory drops to this level or below. */
export const LOW_STOCK_THRESHOLD = 10;

export const LOW_STOCK_ALERT_EMAIL = "dgv@mydgv.com";

/** Minimum units sold to show in "Fast Selling" section and badge. */
export const FAST_SELLING_THRESHOLD = 10;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type PaymentRegion = (typeof PAYMENT_REGIONS)[keyof typeof PAYMENT_REGIONS];
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

export const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  "whole-spices": ["whole-spices", "whole"],
  "ground-spices": ["ground-spices", "powder"],
  "indian-chillies": ["indian-chillies", "chillies", "chili"],
  seeds: ["seeds"],
  herbs: ["herbs"],
  "dried-herbs": ["dried-herbs"],
  roots: ["roots"],
  barks: ["barks"],
  flowers: ["flowers"],
  "premium-spices": ["premium-spices"],
  "regional-spices": ["regional-spices"],
  "indian-masalas": ["indian-masalas", "masalas"],
  "spice-blends": ["spice-blends", "blends"],
  "tea-spices": ["tea-spices"],
  "pickling-spices": ["pickling-spices"],
  "speciality-spices": ["speciality-spices"],
  "bulk-spices": ["bulk-spices", "wholesale"],
};

export function categorySlugVariants(slug: string): string[] {
  const variants = CATEGORY_SLUG_ALIASES[slug];
  return variants ? [...new Set([slug, ...variants])] : [slug];
}
