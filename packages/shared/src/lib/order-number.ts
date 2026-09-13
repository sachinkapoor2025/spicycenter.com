import { VENDOR_ORANGE_COUNTY } from "../constants";

/** Human-readable order numbers: OC10001… (Orange County) / HW10001… (SpicyCorner). */
export const ORDER_NUMBER_START = 10001;

export type OrderNumberPrefix = "OC" | "HW";
/** Legacy SpicyCorner prefix still stored on older orders. */
export type LegacyOrderNumberPrefix = "US";
export type StoredOrderNumberPrefix = OrderNumberPrefix | LegacyOrderNumberPrefix;

const HUMAN_ORDER_NUMBER_RE = /^(OC|US|HW)(\d{5,})$/i;

export function isHumanOrderNumber(value: string): boolean {
  return HUMAN_ORDER_NUMBER_RE.test(value.trim());
}

export function parseHumanOrderNumber(
  value: string
): { prefix: StoredOrderNumberPrefix; seq: number } | null {
  const m = value.trim().match(HUMAN_ORDER_NUMBER_RE);
  if (!m) return null;
  return {
    prefix: m[1]!.toUpperCase() as StoredOrderNumberPrefix,
    seq: Number(m[2]),
  };
}

export function formatOrderNumber(prefix: StoredOrderNumberPrefix, seq: number): string {
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

/**
 * HW continues the existing US Dynamo counter so numbers stay sequential
 * (US10007, then HW10008…).
 */
export function orderNumberCounterPrefix(
  prefix: StoredOrderNumberPrefix
): LegacyOrderNumberPrefix | "OC" {
  return prefix === "OC" ? "OC" : "US";
}

/** Prefer human orderNumber when present; else short UUID for display. */
export function displayOrderRef(order: {
  orderNumber?: string | null;
  orderId: string;
}): string {
  const n = order.orderNumber?.trim();
  if (n) return n;
  return order.orderId.slice(0, 8).toUpperCase();
}

/** OC prefix when the order includes any Orange County vendor lines. */
export function orderNumberPrefixForItems(
  items: Array<{ vendorSlug?: string | null }>,
  vendorSlugs?: string[] | null
): OrderNumberPrefix {
  if (vendorSlugs?.includes(VENDOR_ORANGE_COUNTY)) return "OC";
  if (items.some((i) => i.vendorSlug === VENDOR_ORANGE_COUNTY)) return "OC";
  return "HW";
}
