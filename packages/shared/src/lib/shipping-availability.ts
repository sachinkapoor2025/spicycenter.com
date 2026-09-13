import { CJ_STOREFRONT_SHIP_COUNTRIES } from "../schemas/cj-dropshipping";

/** Destinations the storefront can request a live CJ freight quote for. */
export const QUOTEABLE_SHIP_COUNTRIES = CJ_STOREFRONT_SHIP_COUNTRIES;

export type ShippingAvailability = "available" | "quoteable" | "unknown" | "unavailable";

export type ShippingAvailabilityProduct = {
  availableCountryCodes?: string[] | null;
  inventory?: number | null;
};

function iso(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

export function isQuoteableStorefrontCountry(countryCode: string): boolean {
  return (QUOTEABLE_SHIP_COUNTRIES as readonly string[]).includes(iso(countryCode));
}

/**
 * SEO/catalog availability — conservative.
 * `availableCountryCodes` is the only hard allow/deny list.
 * Otherwise US/CA/GB/AU/DE are quoteable (not guaranteed) via the product shipping API.
 * Never treat CJ marketing ("200+ countries") as per-SKU availability.
 */
export function isProductAvailableForCountry(
  product: ShippingAvailabilityProduct,
  countryCode: string
): ShippingAvailability {
  const cc = iso(countryCode);
  if (!cc) return "unknown";
  if (product.inventory === 0) return "unavailable";

  const listed = (product.availableCountryCodes ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (listed.length) return listed.includes(cc) ? "available" : "unavailable";

  if (isQuoteableStorefrontCountry(cc)) return "quoteable";
  return "unknown";
}

export function getAvailableProductsForCountry<T extends ShippingAvailabilityProduct>(
  products: readonly T[],
  countryCode: string
): T[] {
  return products.filter((p) => {
    const status = isProductAvailableForCountry(p, countryCode);
    return status === "available" || status === "quoteable";
  });
}

export function getCountryShippingStatus(countryCode: string): {
  quoteableOnStorefront: boolean;
  lastSync: null;
} {
  return {
    quoteableOnStorefront: isQuoteableStorefrontCountry(countryCode),
    lastSync: null,
  };
}
