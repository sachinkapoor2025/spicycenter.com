"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_USD_INR_RATE,
  DEFAULT_USD_RATES,
  completeUsdRates,
  convertCurrency,
  displayCurrencyForCountry,
  displayCurrencyFractionDigits,
  displayCurrencyLocale,
  fetchLiveUsdRates,
  normalizeDisplayCurrency,
  type DisplayCurrency,
} from "@spicycorner/shared";
import { getApiUrl } from "./env";
import { detectCountryFromClientIp } from "./ip-geo";

export type { DisplayCurrency };

const STORAGE_KEY = "hr_ecom_currency";
const MANUAL_KEY = "hr_ecom_currency_manual";
const RATE_CACHE_KEY = "hr_ecom_usd_rates";
const RATE_CACHE_AT_KEY = "hr_ecom_usd_rates_at";
const RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const ENV_FALLBACK = Number(process.env.NEXT_PUBLIC_USD_INR_RATE) || DEFAULT_USD_INR_RATE;

interface CurrencyContextValue {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: string, source?: "manual" | "geo") => void;
  usdInrRate: number;
  rateLoading: boolean;
  rateSource: string;
  convert: (amount: number, from: DisplayCurrency | string) => number;
  format: (amount: number, from: DisplayCurrency | string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readCachedRates(): Record<string, number> | null {
  if (typeof window === "undefined") return null;
  const cachedAt = sessionStorage.getItem(RATE_CACHE_AT_KEY);
  const cached = sessionStorage.getItem(RATE_CACHE_KEY);
  if (!cached || !cachedAt) return null;
  if (Date.now() - Number(cachedAt) > RATE_CACHE_TTL_MS) return null;
  try {
    const parsed = JSON.parse(cached) as Record<string, number>;
    if (parsed && typeof parsed === "object" && Number(parsed.INR) > 0) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function storeCachedRates(rates: Record<string, number>) {
  sessionStorage.setItem(RATE_CACHE_KEY, JSON.stringify(rates));
  sessionStorage.setItem(RATE_CACHE_AT_KEY, String(Date.now()));
}

async function fetchUsdRates(): Promise<{ rates: Record<DisplayCurrency, number>; source: string }> {
  const sessionCached = readCachedRates();
  if (sessionCached) return { rates: completeUsdRates(sessionCached), source: "session-cache" };

  try {
    const res = await fetch("/api/fx", { cache: "force-cache" });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number>; source?: string };
      if (data.rates) {
        const rates = completeUsdRates(data.rates);
        storeCachedRates(rates);
        return { rates, source: data.source ?? "api" };
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch(`${getApiUrl()}/config/fx-rates`, { cache: "force-cache" });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number>; source?: string };
      if (data.rates) {
        const rates = completeUsdRates(data.rates);
        storeCachedRates(rates);
        return { rates, source: data.source ?? "api" };
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const live = await fetchLiveUsdRates();
    if (live?.rates) {
      const rates = completeUsdRates(live.rates);
      storeCachedRates(rates);
      return { rates, source: live.source };
    }
  } catch {
    /* fall through */
  }

  const fallback = completeUsdRates({ ...DEFAULT_USD_RATES, INR: ENV_FALLBACK });
  return { rates: fallback, source: "fallback" };
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>("GBP");
  const [rates, setRates] = useState<Record<DisplayCurrency, number>>(() =>
    completeUsdRates({ INR: ENV_FALLBACK })
  );
  const [rateSource, setRateSource] = useState("loading");
  const [rateLoading, setRateLoading] = useState(true);

  const usdInrRate = rates.INR || ENV_FALLBACK;

  const refreshRate = useCallback(async () => {
    const { rates: next, source } = await fetchUsdRates();
    setRates(next);
    setRateSource(source);
    setRateLoading(false);
  }, []);

  const setDisplayCurrency = useCallback((c: string, source: "manual" | "geo" = "manual") => {
    const code = normalizeDisplayCurrency(c);
    setDisplayCurrencyState(code);
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, code);
    if (source === "manual") localStorage.setItem(MANUAL_KEY, "true");
  }, []);

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      const manual = localStorage.getItem(MANUAL_KEY) === "true";
      if (saved) setDisplayCurrencyState(normalizeDisplayCurrency(saved));
      if (manual && saved) return;
      try {
        const res = await fetch("/api/geo", { cache: "force-cache" });
        let country: string | undefined;
        let currency: string | undefined;
        if (res.ok) {
          const data = (await res.json()) as { currency?: string; source?: string; country?: string };
          if (data.source && data.source !== "default") {
            currency = data.currency;
            country = data.country;
          }
        }
        if (!currency) {
          country = await detectCountryFromClientIp();
          if (country) currency = displayCurrencyForCountry(country);
        }
        if (localStorage.getItem(MANUAL_KEY) === "true") return;
        if (currency) {
          const code = normalizeDisplayCurrency(currency);
          setDisplayCurrencyState(code);
          localStorage.setItem(STORAGE_KEY, code);
        } else if (!saved) {
          setDisplayCurrencyState("GBP");
        }
      } catch {
        /* keep saved or USD */
      }
    };

    void init();
    void refreshRate();

    const interval = setInterval(() => {
      void refreshRate();
    }, RATE_CACHE_TTL_MS);

    return () => clearInterval(interval);
  }, [refreshRate]);

  const convert = useCallback(
    (amount: number, from: DisplayCurrency | string) =>
      convertCurrency(amount, normalizeDisplayCurrency(from), displayCurrency, rates),
    [displayCurrency, rates]
  );

  const format = useCallback(
    (amount: number, from: DisplayCurrency | string) => {
      const value = convert(amount, from);
      return new Intl.NumberFormat(displayCurrencyLocale(displayCurrency), {
        style: "currency",
        currency: displayCurrency,
        maximumFractionDigits: displayCurrencyFractionDigits(displayCurrency),
        minimumFractionDigits: displayCurrencyFractionDigits(displayCurrency),
      }).format(value);
    },
    [convert, displayCurrency]
  );

  const value = useMemo(
    () => ({ displayCurrency, setDisplayCurrency, usdInrRate, rateLoading, rateSource, convert, format }),
    [displayCurrency, setDisplayCurrency, usdInrRate, rateLoading, rateSource, convert, format]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
