import { roundForCurrency, type ShopCurrency } from "../currency";
import {
  ORANGE_COUNTY_LIST_MARKUP,
  ORANGE_COUNTY_SALE_MARKUP,
  VENDOR_CJ_DROPSHIPPING,
  VENDOR_EPROLO,
} from "../constants";

/** Live catalog SKU imported from CJ (as opposed to bundled sample products). */
export function isCjDropshippingProduct(product: {
  vendorSlug?: string | null;
  cjPid?: string | null;
}): boolean {
  return product.vendorSlug === VENDOR_CJ_DROPSHIPPING || Boolean(product.cjPid);
}

/** Live catalog SKU imported from Eprolo. */
export function isEproloProduct(product: {
  vendorSlug?: string | null;
  eproloProductId?: string | null;
}): boolean {
  return product.vendorSlug === VENDOR_EPROLO || Boolean(product.eproloProductId);
}

/** Round money to cents for USD (or currency-aware). */
export function roundMoney(n: number, currency: ShopCurrency = "USD"): number {
  return roundForCurrency(n, currency);
}

/**
 * Convert vendor wholesale cost → store list + sale prices.
 * Sale targets ~50% gross margin; list is higher for the sale strikethrough.
 * Vendor identity is backend-only — not part of customer-facing copy.
 */
export function pricingFromVendorCost(
  vendorCost: number,
  currency: ShopCurrency = "USD"
): { vendorCost: number; price: number; compareAtPrice: number } {
  const cost = Number(vendorCost);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error("vendorCost must be a positive number");
  }
  const compareAtPrice = roundMoney(cost * ORANGE_COUNTY_LIST_MARKUP, currency);
  const price = roundMoney(cost * ORANGE_COUNTY_SALE_MARKUP, currency);
  return { vendorCost: roundMoney(cost, currency), price, compareAtPrice };
}

/** Strip backend-only vendor fields before public product APIs / SSR. */
export function stripVendorPrivateFields<
  T extends {
    vendorCost?: number;
    vendorSlug?: string;
    cjVariants?: Array<{ vendorCost?: number }>;
  },
>(product: T): Omit<T, "vendorCost" | "vendorSlug"> {
  const { vendorCost: _c, vendorSlug: _v, ...rest } = product;
  if (!rest.cjVariants?.length) return rest as Omit<T, "vendorCost" | "vendorSlug">;
  return {
    ...rest,
    cjVariants: rest.cjVariants.map(({ vendorCost: _vc, ...variant }) => variant),
  } as Omit<T, "vendorCost" | "vendorSlug">;
}

/** @deprecated Use stripVendorPrivateFields */
export function stripVendorCost<T extends { vendorCost?: number }>(product: T): Omit<T, "vendorCost"> {
  const { vendorCost: _cost, ...rest } = product;
  return rest;
}
