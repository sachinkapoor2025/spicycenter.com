import { VENDOR_ORANGE_COUNTY, VENDOR_SPICYCORNER, VENDOR_CJ_DROPSHIPPING, VENDOR_EPROLO } from "../constants";

export { VENDOR_SPICYCORNER, VENDOR_CJ_DROPSHIPPING, VENDOR_EPROLO };

export type OrderVendorSlug =
  | typeof VENDOR_ORANGE_COUNTY
  | typeof VENDOR_SPICYCORNER
  | typeof VENDOR_CJ_DROPSHIPPING
  | typeof VENDOR_EPROLO
  | string;

export type VendorFulfillment = {
  vendorSlug: string;
  warehouseId?: string;
  trackingNumber?: string;
  carrier?: string;
  /** pending until AWB recorded; shipped once tracking is set. */
  status?: "pending" | "processing" | "shipped" | "delivered";
  updatedAt?: string;
  /** CJ shopping order id after createOrderV2. */
  cjOrderId?: string;
  cjOrderNumber?: string;
  cjPayUrl?: string;
  /** Eprolo fulfillment order id after create-order. */
  eproloOrderId?: string;
  eproloOrderNumber?: string;
};

export function lineVendorKey(item: { vendorSlug?: string | null }): string {
  const slug = item.vendorSlug?.trim();
  return slug || VENDOR_SPICYCORNER;
}

export function vendorDisplayLabel(slug: string): string {
  if (slug === VENDOR_ORANGE_COUNTY) return "Orange County";
  if (slug === VENDOR_SPICYCORNER) return "SpicyCenter";
  if (slug === VENDOR_CJ_DROPSHIPPING) return "CJ Dropshipping";
  if (slug === VENDOR_EPROLO) return "Eprolo";
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Distinct fulfillment vendors present on the order (SpicyCenter implied for untagged lines). */
export function orderVendorKeys(order: {
  vendorSlugs?: string[];
  items?: Array<{ vendorSlug?: string | null }>;
}): string[] {
  const keys = new Set<string>();
  for (const item of order.items ?? []) {
    keys.add(lineVendorKey(item));
  }
  // Older OC-only orders may only have vendorSlugs
  for (const s of order.vendorSlugs ?? []) {
    if (s.trim()) keys.add(s.trim());
  }
  if (keys.size === 0) keys.add(VENDOR_SPICYCORNER);
  return Array.from(keys).sort((a, b) => {
    if (a === VENDOR_ORANGE_COUNTY) return -1;
    if (b === VENDOR_ORANGE_COUNTY) return 1;
    if (a === VENDOR_SPICYCORNER) return -1;
    if (b === VENDOR_SPICYCORNER) return 1;
    return a.localeCompare(b);
  });
}

export function orderHasVendor(
  order: { vendorSlugs?: string[]; items?: Array<{ vendorSlug?: string | null }> },
  vendor: string
): boolean {
  return orderVendorKeys(order).includes(vendor);
}

export function orderHasOrangeCounty(order: {
  vendorSlugs?: string[];
  items?: Array<{ vendorSlug?: string | null }>;
}): boolean {
  return orderHasVendor(order, VENDOR_ORANGE_COUNTY);
}

export function orderHasUsarakhi(order: {
  vendorSlugs?: string[];
  items?: Array<{ vendorSlug?: string | null }>;
}): boolean {
  return orderHasVendor(order, VENDOR_SPICYCORNER);
}

export function isMultiVendorOrder(order: {
  vendorSlugs?: string[];
  items?: Array<{ vendorSlug?: string | null }>;
}): boolean {
  return orderVendorKeys(order).length > 1;
}

function fulfillmentShipped(f: VendorFulfillment): boolean {
  if (f.status === "shipped" || f.status === "delivered") return true;
  return Boolean(f.trackingNumber?.trim());
}

/** Build / refresh per-vendor fulfillment rows from line items + existing data. */
export function ensureVendorFulfillments(order: {
  vendorSlugs?: string[];
  items?: Array<{ vendorSlug?: string | null }>;
  vendorFulfillments?: VendorFulfillment[];
  trackingNumber?: string;
  carrier?: string;
}): VendorFulfillment[] {
  const keys = orderVendorKeys(order);
  const bySlug = new Map<string, VendorFulfillment>();
  for (const f of order.vendorFulfillments ?? []) {
    if (!f.vendorSlug?.trim()) continue;
    bySlug.set(f.vendorSlug.trim(), { ...f, vendorSlug: f.vendorSlug.trim() });
  }

  // Backfill legacy order-level tracking onto the sole vendor, or OC when mixed (OC historically wrote AWB).
  const legacyTn = order.trackingNumber?.trim();
  if (legacyTn) {
    const target =
      keys.length === 1
        ? keys[0]!
        : keys.includes(VENDOR_ORANGE_COUNTY)
          ? VENDOR_ORANGE_COUNTY
          : keys[0]!;
    const existing = bySlug.get(target);
    if (!existing?.trackingNumber?.trim()) {
      bySlug.set(target, {
        vendorSlug: target,
        trackingNumber: legacyTn,
        carrier: order.carrier?.trim() || existing?.carrier,
        status: existing?.status ?? "shipped",
        updatedAt: existing?.updatedAt,
      });
    }
  }

  return keys.map((vendorSlug) => {
    const prev = bySlug.get(vendorSlug);
    if (prev) {
      return {
        ...prev,
        status: prev.status ?? (fulfillmentShipped(prev) ? "shipped" : "pending"),
      };
    }
    return { vendorSlug, status: "pending" as const };
  });
}

export function upsertVendorFulfillment(
  fulfillments: VendorFulfillment[],
  patch: {
    vendorSlug: string;
    warehouseId?: string;
    trackingNumber?: string;
    carrier?: string;
    status?: VendorFulfillment["status"];
    updatedAt?: string;
    cjOrderId?: string;
    cjOrderNumber?: string;
    cjPayUrl?: string;
    eproloOrderId?: string;
    eproloOrderNumber?: string;
  }
): VendorFulfillment[] {
  const slug = patch.vendorSlug.trim();
  const next = fulfillments.map((f) => ({ ...f }));
  const idx = next.findIndex((f) => f.vendorSlug === slug);
  const base: VendorFulfillment =
    idx >= 0 ? next[idx]! : { vendorSlug: slug, status: "pending" };
  const trackingNumber =
    patch.trackingNumber !== undefined ? patch.trackingNumber.trim() : base.trackingNumber;
  const carrier = patch.carrier !== undefined ? patch.carrier.trim() : base.carrier;
  const warehouseId = patch.warehouseId !== undefined ? patch.warehouseId.trim() : base.warehouseId;
  const status =
    patch.status ??
    (trackingNumber ? ("shipped" as const) : base.status ?? ("pending" as const));
  const cjOrderId = patch.cjOrderId !== undefined ? patch.cjOrderId.trim() : base.cjOrderId;
  const cjOrderNumber =
    patch.cjOrderNumber !== undefined ? patch.cjOrderNumber.trim() : base.cjOrderNumber;
  const cjPayUrl = patch.cjPayUrl !== undefined ? patch.cjPayUrl.trim() : base.cjPayUrl;
  const eproloOrderId =
    patch.eproloOrderId !== undefined ? patch.eproloOrderId.trim() : base.eproloOrderId;
  const eproloOrderNumber =
    patch.eproloOrderNumber !== undefined ? patch.eproloOrderNumber.trim() : base.eproloOrderNumber;
  const row: VendorFulfillment = {
    vendorSlug: slug,
    ...(warehouseId ? { warehouseId } : {}),
    ...(trackingNumber ? { trackingNumber } : {}),
    ...(carrier ? { carrier } : {}),
    status,
    ...(cjOrderId ? { cjOrderId } : {}),
    ...(cjOrderNumber ? { cjOrderNumber } : {}),
    ...(cjPayUrl ? { cjPayUrl } : {}),
    ...(eproloOrderId ? { eproloOrderId } : {}),
    ...(eproloOrderNumber ? { eproloOrderNumber } : {}),
    ...(patch.updatedAt ? { updatedAt: patch.updatedAt } : base.updatedAt ? { updatedAt: base.updatedAt } : {}),
  };
  if (idx >= 0) next[idx] = row;
  else next.push(row);
  return next;
}

export function allVendorsHaveTracking(fulfillments: VendorFulfillment[]): boolean {
  if (!fulfillments.length) return false;
  return fulfillments.every((f) => Boolean(f.trackingNumber?.trim()));
}

export function anyVendorHasTracking(fulfillments: VendorFulfillment[]): boolean {
  return fulfillments.some((f) => Boolean(f.trackingNumber?.trim()));
}

/** Prefer first non-empty tracking for legacy order.trackingNumber field. */
export function primaryTrackingFromFulfillments(fulfillments: VendorFulfillment[]): {
  trackingNumber?: string;
  carrier?: string;
} {
  const withTn = fulfillments.find((f) => f.trackingNumber?.trim());
  if (!withTn) return {};
  return {
    trackingNumber: withTn.trackingNumber,
    ...(withTn.carrier ? { carrier: withTn.carrier } : {}),
  };
}

export function buildInitialVendorFulfillments(
  items: Array<{ vendorSlug?: string | null }>
): VendorFulfillment[] {
  return ensureVendorFulfillments({ items, vendorFulfillments: [] });
}
