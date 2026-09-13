import type { CartItem } from "./schemas/cart";
import { cartLineUnitTotal, sumAddonPrices } from "./lib/product-addons";

export type ShopCurrency = "USD" | "INR";

/** Last-resort fallback when live providers are unavailable (~Jun 2026). */
export const DEFAULT_USD_INR_RATE = 96;

export type ExchangeRateQuote = {
  rate: number;
  source: string;
  asOf: string;
};

export function roundForCurrency(amount: number, currency: ShopCurrency): number {
  return currency === "INR" ? Math.round(amount) : Math.round(amount * 100) / 100;
}

export function convertCurrencyAmount(
  amount: number,
  from: ShopCurrency,
  to: ShopCurrency,
  rate: number
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "INR") return amount * rate;
  return amount / rate;
}

/** Convert cart line items to the checkout currency (e.g. USD catalog → INR Razorpay). */
export function convertCartItemsToCurrency(
  items: CartItem[],
  to: ShopCurrency,
  rate: number
): CartItem[] {
  if (!items.length) return items;
  const from = items[0].currency;
  if (from === to) return items;

  return items.map((item) => ({
    ...item,
    price: roundForCurrency(convertCurrencyAmount(item.price, from, to, rate), to),
    currency: to,
    ...(item.addons?.length
      ? {
          addons: item.addons.map((a) => ({
            ...a,
            price: roundForCurrency(convertCurrencyAmount(a.price, from, to, rate), to),
          })),
        }
      : {}),
  }));
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartLineUnitTotal(item) * item.quantity, 0);
}

export { cartLineUnitTotal, sumAddonPrices };

export function resolveUsdInrRate(envRate?: string | number): number {
  const parsed = Number(envRate);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_USD_INR_RATE;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export type UsdRatesQuote = {
  rates: Record<string, number>;
  source: string;
  asOf: string;
};

function positiveRates(raw: Record<string, number> | undefined): Record<string, number> | null {
  if (!raw) return null;
  const rates: Record<string, number> = { USD: 1 };
  for (const [code, value] of Object.entries(raw)) {
    if (typeof value === "number" && value > 0) rates[code.toUpperCase()] = value;
  }
  return Object.keys(rates).length > 1 ? rates : null;
}

/** Fetch USD→all rates from public FX APIs (no API key). */
export async function fetchLiveUsdRates(): Promise<UsdRatesQuote | null> {
  const asOf = new Date().toISOString();

  try {
    const data = (await fetchJson("https://open.er-api.com/v6/latest/USD")) as {
      rates?: Record<string, number>;
    };
    const rates = positiveRates(data.rates);
    if (rates) return { rates, source: "open.er-api.com", asOf };
  } catch {
    /* try next provider */
  }

  try {
    const data = (await fetchJson("https://api.frankfurter.app/latest?from=USD")) as {
      rates?: Record<string, number>;
    };
    const rates = positiveRates(data.rates);
    if (rates) return { rates, source: "frankfurter", asOf };
  } catch {
    /* try next provider */
  }

  try {
    const data = (await fetchJson("https://api.exchangerate.host/latest?base=USD")) as {
      rates?: Record<string, number>;
    };
    const rates = positiveRates(data.rates);
    if (rates) return { rates, source: "exchangerate.host", asOf };
  } catch {
    /* exhausted providers */
  }

  return null;
}

/** Fetch USD→INR from public rate APIs (no API key). Tries multiple providers. */
export async function fetchLiveUsdInrRate(): Promise<ExchangeRateQuote | null> {
  const quote = await fetchLiveUsdRates();
  const rate = quote?.rates.INR;
  if (quote && rate && rate > 0) {
    return { rate, source: quote.source, asOf: quote.asOf };
  }
  return null;
}
