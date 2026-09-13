import {
  convertCartItemsToCurrency,
  quoteAddressShipmentShipping,
  quoteFreeShippingThreshold,
  type CartItem,
  type FreeShippingQuote,
  type ShopCurrency,
} from "@spicycorner/shared";
import type { DisplayCurrency } from "@/lib/currency-context";

export function payCurrencyForDisplay(display: DisplayCurrency): ShopCurrency {
  return display === "INR" ? "INR" : "USD";
}

export function quoteCartShipping(
  items: CartItem[],
  payCurrency: ShopCurrency,
  usdInrRate: number
): { totalCharge: number; quote: FreeShippingQuote | null } {
  if (!items.length) return { totalCharge: 0, quote: null };
  const priced = convertCartItemsToCurrency(items, payCurrency, usdInrRate);
  const result = quoteAddressShipmentShipping({
    items: priced,
    currency: payCurrency,
    usdInrRate,
  });
  return {
    totalCharge: result.totalCharge,
    quote: result.perVendor[0] ?? null,
  };
}

export function quoteItemShipping(
  subtotal: number,
  catalogCurrency: string,
  usdInrRate: number
): FreeShippingQuote {
  const currency: ShopCurrency = catalogCurrency === "INR" ? "INR" : "USD";
  return quoteFreeShippingThreshold({ subtotal, currency, usdInrRate });
}
