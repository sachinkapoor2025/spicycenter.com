import { convertCurrencyAmount, roundForCurrency, DEFAULT_USD_INR_RATE, type ShopCurrency } from "../currency";
import {
  DISPLAY_CURRENCIES,
  displayCurrencyFractionDigits,
  isDisplayCurrency,
  type DisplayCurrency,
} from "./display-currencies";

export type { DisplayCurrency };
export {
  DISPLAY_CURRENCIES,
  DISPLAY_CURRENCY_OPTIONS,
  PREFERRED_DISPLAY_CURRENCIES,
  REST_DISPLAY_CURRENCIES,
  displayCurrencyForCountry,
  displayCurrencyFractionDigits,
  displayCurrencyLocale,
  isDisplayCurrency,
} from "./display-currencies";

export function normalizeDisplayCurrency(value: string): DisplayCurrency {
  const code = value.trim().toUpperCase();
  return isDisplayCurrency(code) ? code : "USD";
}

/** Last-resort USD→X rates when live FX is unavailable. */
export const DEFAULT_USD_RATES: Record<DisplayCurrency, number> = {
  USD: 1,
  GBP: 0.74,
  CAD: 1.38,
  AUD: 1.52,
  AED: 3.6725,
  EUR: 0.85,
  INR: DEFAULT_USD_INR_RATE,
  BDT: 122,
  BRL: 5.4,
  CHF: 0.8,
  CNY: 7.2,
  CZK: 21,
  DKK: 6.4,
  EGP: 48,
  HKD: 7.8,
  HUF: 340,
  IDR: 16400,
  ILS: 3.3,
  JPY: 150,
  KES: 129,
  KRW: 1390,
  MXN: 18.5,
  MYR: 4.2,
  NOK: 10,
  NZD: 1.68,
  PHP: 58,
  PKR: 280,
  PLN: 3.65,
  QAR: 3.64,
  RON: 4.3,
  SAR: 3.75,
  SEK: 9.5,
  SGD: 1.28,
  THB: 32.5,
  TRY: 41,
  TWD: 32,
  VND: 26300,
  ZAR: 17.8,
};

export function usdRateFor(
  currency: DisplayCurrency,
  rates: Record<string, number> | number
): number {
  if (typeof rates === "number") {
    if (currency === "USD") return 1;
    if (currency === "INR") return rates;
    return DEFAULT_USD_RATES[currency] ?? 1;
  }
  if (currency === "USD") return 1;
  const live = rates[currency];
  if (live && live > 0) return live;
  return DEFAULT_USD_RATES[currency] ?? 1;
}

export function roundDisplayAmount(amount: number, currency: DisplayCurrency): number {
  const digits = displayCurrencyFractionDigits(currency);
  const f = 10 ** digits;
  return Math.round(amount * f) / f;
}

/**
 * Convert between display currencies.
 * `rateOrRates` may be the legacy USD→INR number or a USD→currency map.
 */
export function convertCurrency(
  amount: number,
  from: DisplayCurrency | ShopCurrency | string,
  to: DisplayCurrency | ShopCurrency | string,
  rateOrRates: number | Record<string, number>
): number {
  const src = normalizeDisplayCurrency(from);
  const dest = normalizeDisplayCurrency(to);
  if (src === dest) {
    return typeof rateOrRates === "number"
      ? roundForCurrency(amount, dest === "INR" ? "INR" : "USD")
      : roundDisplayAmount(amount, dest);
  }

  if (typeof rateOrRates === "number" && (src === "USD" || src === "INR") && (dest === "USD" || dest === "INR")) {
    return roundForCurrency(convertCurrencyAmount(amount, src, dest, rateOrRates), dest);
  }

  const fromRate = usdRateFor(src, rateOrRates);
  const toRate = usdRateFor(dest, rateOrRates);
  const usd = src === "USD" ? amount : amount / fromRate;
  return roundDisplayAmount(usd * toRate, dest);
}

export function completeUsdRates(partial?: Record<string, number>): Record<DisplayCurrency, number> {
  const next = { ...DEFAULT_USD_RATES };
  for (const code of DISPLAY_CURRENCIES) {
    const live = partial?.[code];
    if (live && live > 0) next[code] = live;
  }
  next.USD = 1;
  return next;
}
