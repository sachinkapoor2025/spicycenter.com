/** Display-only storefront currencies. Checkout remains USD (Stripe) or INR (Razorpay). */

export const PREFERRED_DISPLAY_CURRENCIES = [
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "AED",
  "EUR",
  "INR",
] as const;

/** Remaining currencies, after the preferred US/UK/CAN/AUS/UAE/EUR/IND list. */
export const REST_DISPLAY_CURRENCIES = [
  "BDT",
  "BRL",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EGP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "JPY",
  "KES",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PKR",
  "PLN",
  "QAR",
  "RON",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "VND",
  "ZAR",
] as const;

export const DISPLAY_CURRENCIES = [
  ...PREFERRED_DISPLAY_CURRENCIES,
  ...REST_DISPLAY_CURRENCIES,
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export type DisplayCurrencyOption = {
  code: DisplayCurrency;
  label: string;
  region: string;
};

const REGION_LABELS: Record<DisplayCurrency, string> = {
  USD: "United States",
  GBP: "United Kingdom",
  CAD: "Canada",
  AUD: "Australia",
  AED: "United Arab Emirates",
  EUR: "Europe",
  INR: "India",
  BDT: "Bangladesh",
  BRL: "Brazil",
  CHF: "Switzerland",
  CNY: "China",
  CZK: "Czechia",
  DKK: "Denmark",
  EGP: "Egypt",
  HKD: "Hong Kong",
  HUF: "Hungary",
  IDR: "Indonesia",
  ILS: "Israel",
  JPY: "Japan",
  KES: "Kenya",
  KRW: "South Korea",
  MXN: "Mexico",
  MYR: "Malaysia",
  NOK: "Norway",
  NZD: "New Zealand",
  PHP: "Philippines",
  PKR: "Pakistan",
  PLN: "Poland",
  QAR: "Qatar",
  RON: "Romania",
  SAR: "Saudi Arabia",
  SEK: "Sweden",
  SGD: "Singapore",
  THB: "Thailand",
  TRY: "Turkey",
  TWD: "Taiwan",
  VND: "Vietnam",
  ZAR: "South Africa",
};

export const DISPLAY_CURRENCY_OPTIONS: DisplayCurrencyOption[] = DISPLAY_CURRENCIES.map((code) => ({
  code,
  region: REGION_LABELS[code],
  label: code,
}));

const DISPLAY_SET = new Set<string>(DISPLAY_CURRENCIES);

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return DISPLAY_SET.has(value);
}

const ZERO_DECIMAL = new Set<DisplayCurrency>(["INR", "JPY", "KRW", "VND", "IDR"]);

export function displayCurrencyFractionDigits(currency: DisplayCurrency): number {
  return ZERO_DECIMAL.has(currency) ? 0 : 2;
}

export function displayCurrencyLocale(currency: DisplayCurrency): string {
  switch (currency) {
    case "GBP":
      return "en-GB";
    case "CAD":
      return "en-CA";
    case "AUD":
    case "NZD":
      return "en-AU";
    case "AED":
      return "en-AE";
    case "EUR":
      return "en-IE";
    case "INR":
      return "en-IN";
    default:
      return "en-US";
  }
}

const EUROZONE = new Set([
  "AT",
  "BE",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
  "HR",
  "AD",
  "MC",
  "SM",
  "VA",
  "ME",
]);

const COUNTRY_CURRENCY: Record<string, DisplayCurrency> = {
  US: "USD",
  PR: "USD",
  GU: "USD",
  VI: "USD",
  AS: "USD",
  MP: "USD",
  GB: "GBP",
  IM: "GBP",
  JE: "GBP",
  GG: "GBP",
  CA: "CAD",
  AU: "AUD",
  CX: "AUD",
  CC: "AUD",
  NF: "AUD",
  AE: "AED",
  IN: "INR",
  NZ: "NZD",
  CK: "NZD",
  NU: "NZD",
  TK: "NZD",
  BD: "BDT",
  BR: "BRL",
  CH: "CHF",
  LI: "CHF",
  CN: "CNY",
  CZ: "CZK",
  DK: "DKK",
  FO: "DKK",
  GL: "DKK",
  EG: "EGP",
  HK: "HKD",
  HU: "HUF",
  ID: "IDR",
  IL: "ILS",
  JP: "JPY",
  KE: "KES",
  KR: "KRW",
  MX: "MXN",
  MY: "MYR",
  NO: "NOK",
  PH: "PHP",
  PK: "PKR",
  PL: "PLN",
  QA: "QAR",
  RO: "RON",
  SA: "SAR",
  SE: "SEK",
  SG: "SGD",
  TH: "THB",
  TR: "TRY",
  TW: "TWD",
  VN: "VND",
  ZA: "ZAR",
};

/** ISO country → storefront display currency. Unknown countries default to USD. */
export function displayCurrencyForCountry(country: string | undefined): DisplayCurrency {
  const code = country?.trim().toUpperCase();
  if (!code) return "USD";
  if (COUNTRY_CURRENCY[code]) return COUNTRY_CURRENCY[code];
  if (EUROZONE.has(code)) return "EUR";
  return "USD";
}
