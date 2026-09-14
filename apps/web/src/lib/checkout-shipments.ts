import {
  addressFingerprint,
  cartLineUnitTotal,
  isValidShippingPhone,
  quoteAddressShipmentShipping,
  shippingVendorKey,
  type CartItem,
  type CheckoutShipment,
  type FreeShippingQuote,
  type ShippingAddress,
  type ShopCurrency,
} from "@spicycorner/shared";
import { emptyShippingAddress } from "@/lib/shipping-address";

export type DeliveryUnit = {
  key: string;
  productSlug: string;
  name: string;
  price: number;
  image?: string;
  /** Copied from cart — drives per-vendor free-shipping buckets. */
  vendorSlug?: string;
  useSameAddress: boolean;
  address: ShippingAddress;
};

/** Expand cart lines into one delivery unit per quantity (each item can ship separately). */
export function expandCartToDeliveryUnits(
  items: CartItem[],
  previous: DeliveryUnit[] = []
): DeliveryUnit[] {
  const prevByKey = new Map(previous.map((u) => [u.key, u]));
  const units: DeliveryUnit[] = [];

  for (const item of items) {
    const unitPrice = cartLineUnitTotal(item);
    const lineBase = item.lineId ?? item.productSlug;
    for (let i = 0; i < item.quantity; i++) {
      const key = `${lineBase}#${i}`;
      const prev = prevByKey.get(key);
      units.push({
        key,
        productSlug: item.productSlug,
        name: item.name,
        price: unitPrice,
        image: item.image,
        vendorSlug: item.vendorSlug,
        useSameAddress: prev?.useSameAddress ?? true,
        address: prev?.address ?? emptyShippingAddress(),
      });
    }
  }
  return units;
}

function withCountryFallback(
  address: ShippingAddress
): CheckoutShipment["shippingAddress"] {
  return {
    ...address,
    country: address.country || "US",
  };
}

export function validateDeliveryUnits(
  units: DeliveryUnit[],
  primary: ShippingAddress
): string | null {
  for (const unit of units) {
    if (unit.useSameAddress) continue;
    const a = unit.address;
    if (!a.name.trim()) return `Enter a name for ${unit.name}`;
    if (!a.email.trim()) return `Enter an email for ${unit.name}`;
    if (!isValidShippingPhone(a.phone ?? "")) {
      return `Enter a valid phone for ${unit.name}`;
    }
    if (!a.line1.trim() || !a.city.trim() || !a.state.trim() || !a.postalCode.trim()) {
      return `Complete the delivery address for ${unit.name}`;
    }
  }
  void primary;
  return null;
}

/** Group units into checkout shipments (same address → one shipment). */
export function buildCheckoutShipmentsFromUnits(
  units: DeliveryUnit[],
  primary: ShippingAddress
): CheckoutShipment[] {
  type Acc = {
    shippingAddress: CheckoutShipment["shippingAddress"];
    qtyBySlug: Map<string, number>;
  };
  const groups = new Map<string, Acc>();

  for (const unit of units) {
    const address = unit.useSameAddress
      ? withCountryFallback(primary)
      : withCountryFallback(unit.address);
    const fp = unit.useSameAddress ? "__primary__" : addressFingerprint(address);
    let group = groups.get(fp);
    if (!group) {
      group = { shippingAddress: address, qtyBySlug: new Map() };
      groups.set(fp, group);
    }
    group.qtyBySlug.set(
      unit.productSlug,
      (group.qtyBySlug.get(unit.productSlug) ?? 0) + 1
    );
  }

  return [...groups.values()].map((g) => ({
    shippingAddress: g.shippingAddress,
    items: [...g.qtyBySlug.entries()].map(([productSlug, quantity]) => ({
      productSlug,
      quantity,
    })),
  }));
}

/**
 * Chargeable shipping group subtotals: one bucket per (delivery address × vendor).
 * SpicyCenter and Orange County on the same address are evaluated separately for the $7 rule.
 */
export function shipmentSubtotalsFromUnits(
  units: DeliveryUnit[],
  primary: ShippingAddress
): number[] {
  const groups = new Map<string, number>();

  for (const unit of units) {
    const address = unit.useSameAddress
      ? withCountryFallback(primary)
      : withCountryFallback(unit.address);
    const addressKey = unit.useSameAddress ? "__primary__" : addressFingerprint(address);
    const vendorKey = shippingVendorKey(unit);
    const groupKey = `${addressKey}::${vendorKey}`;
    groups.set(groupKey, (groups.get(groupKey) ?? 0) + unit.price);
  }

  return [...groups.values()];
}

/**
 * Per (address × vendor) shipping quotes — includes flash-combo flat $1 shipping.
 */
export function quoteShippingFromDeliveryUnits(
  units: DeliveryUnit[],
  primary: ShippingAddress,
  currency: ShopCurrency,
  usdInrRate: number
): { totalCharge: number; perShipment: FreeShippingQuote[] } {
  const groups = new Map<
    string,
    Array<{ price: number; quantity: number; vendorSlug?: string; productSlug: string }>
  >();

  for (const unit of units) {
    const address = unit.useSameAddress
      ? withCountryFallback(primary)
      : withCountryFallback(unit.address);
    const addressKey = unit.useSameAddress ? "__primary__" : addressFingerprint(address);
    const vendorKey = shippingVendorKey(unit);
    const groupKey = `${addressKey}::${vendorKey}`;
    const list = groups.get(groupKey) ?? [];
    list.push({
      price: unit.price,
      quantity: 1,
      vendorSlug: unit.vendorSlug,
      productSlug: unit.productSlug,
    });
    groups.set(groupKey, list);
  }

  if (groups.size === 0) {
    return { totalCharge: 0, perShipment: [] };
  }

  const perShipment: FreeShippingQuote[] = [];
  let totalCharge = 0;
  for (const items of groups.values()) {
    const quote = quoteAddressShipmentShipping({ items, currency, usdInrRate });
    perShipment.push(...quote.perVendor);
    totalCharge += quote.totalCharge;
  }
  return { totalCharge, perShipment };
}
