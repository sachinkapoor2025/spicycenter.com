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
import { DEFAULT_MARKET_COUNTRY, DEFAULT_MARKETS, displayCurrencyForCountry, inferViewerCountryCode } from "@spicycorner/shared";
import { getApiUrl } from "./env";
import { useCurrency } from "./currency-context";
import { detectCountryFromClientIp } from "./ip-geo";

const COUNTRY_KEY = "hr_ecom_market_country";
const POSTAL_KEY = "hr_ecom_market_postal";
const MANUAL_KEY = "hr_ecom_market_manual";

export type PublicMarket = {
  countryCode: string;
  name: string;
  slug: string;
  locale: string;
  currency: string;
  checkoutCurrency: "USD" | "INR";
  flagEmoji: string;
  postalLabel: string;
  hreflang?: string;
  allowInternationalFallback: boolean;
  contact: {
    phone?: string;
    phoneNormalized?: string;
    whatsapp?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    stateOrRegion?: string;
    postalCode?: string;
    countryCode?: string;
  };
};

type Serviceability = {
  deliverable: boolean;
  postalValid: boolean;
  postalMessage?: string;
  warehouse?: { warehouseId: string; name: string; city: string; countryCode: string; estimatedDeliveryDays?: number } | null;
  routingReason?: string;
  productAvailable?: boolean;
};

interface MarketContextValue {
  countryCode: string;
  postalCode: string;
  markets: PublicMarket[];
  market: PublicMarket | undefined;
  loading: boolean;
  manualOverride: boolean;
  setMarketLocation: (countryCode: string, postalCode?: string, source?: "manual" | "geo") => void;
  resetToDetectedLocation: () => Promise<void>;
  checkServiceability: (productSlug?: string) => Promise<Serviceability | null>;
  lastServiceability: Serviceability | null;
}

const MarketContext = createContext<MarketContextValue | null>(null);

function readStoredCountry(): string {
  if (typeof window === "undefined") return DEFAULT_MARKET_COUNTRY;
  return localStorage.getItem(COUNTRY_KEY) || DEFAULT_MARKET_COUNTRY;
}

function fallbackPublicMarkets(): PublicMarket[] {
  return DEFAULT_MARKETS.filter((m) => m.active).map((m) => ({
    countryCode: m.countryCode,
    name: m.name,
    slug: m.slug,
    locale: m.locale,
    currency: m.currency,
    checkoutCurrency: m.checkoutCurrency,
    flagEmoji: m.flagEmoji,
    postalLabel: m.postalLabel,
    hreflang: m.hreflang,
    allowInternationalFallback: m.allowInternationalFallback,
    contact: m.contact,
  }));
}

function pickAllowedCountry(detected: string | undefined, list: PublicMarket[], fallback: string): string {
  const code = detected?.trim().toUpperCase();
  if (code && list.some((m) => m.countryCode === code)) return code;
  if (code && list.length === 0) return code;
  return fallback;
}

async function detectVisitorCountry(): Promise<string | undefined> {
  try {
    const geo = await fetch("/api/geo", { cache: "no-store" });
    if (geo.ok) {
      const g = (await geo.json()) as { country?: string; source?: string };
      const code = g.country?.trim().toUpperCase();
      if (code && g.source && g.source !== "default") return code;
    }
  } catch {
    /* try client IP */
  }

  const fromIp = await detectCountryFromClientIp();
  if (fromIp) return fromIp;

  try {
    return inferViewerCountryCode(
      {},
      {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
      }
    );
  } catch {
    return undefined;
  }
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const { setDisplayCurrency } = useCurrency();
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_MARKET_COUNTRY);
  const [postalCode, setPostalCode] = useState("");
  const [markets, setMarkets] = useState<PublicMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);
  const [lastServiceability, setLastServiceability] = useState<Serviceability | null>(null);

  const market = useMemo(
    () => markets.find((m) => m.countryCode === countryCode) ?? markets.find((m) => m.countryCode === "US"),
    [markets, countryCode]
  );

  const applyCheckoutCurrency = useCallback(
    (code: string, _list: PublicMarket[]) => {
      if (typeof window !== "undefined" && localStorage.getItem("hr_ecom_currency_manual") === "true") {
        return;
      }
      setDisplayCurrency(displayCurrencyForCountry(code), "geo");
    },
    [setDisplayCurrency]
  );

  const setMarketLocation = useCallback(
    (nextCountry: string, nextPostal?: string, source: "manual" | "geo" = "manual") => {
      const code = nextCountry.trim().toUpperCase() || DEFAULT_MARKET_COUNTRY;
      setCountryCode(code);
      if (typeof window !== "undefined") {
        localStorage.setItem(COUNTRY_KEY, code);
        if (source === "manual") {
          localStorage.setItem(MANUAL_KEY, "true");
          setManualOverride(true);
        }
        if (nextPostal !== undefined) {
          setPostalCode(nextPostal);
          localStorage.setItem(POSTAL_KEY, nextPostal);
        }
      } else if (nextPostal !== undefined) {
        setPostalCode(nextPostal);
      }
      applyCheckoutCurrency(code, markets);
    },
    [applyCheckoutCurrency, markets]
  );

  useEffect(() => {
    const init = async () => {
      try {
        let list = fallbackPublicMarkets();
        try {
          const res = await fetch(`${getApiUrl()}/markets`, { cache: "force-cache" });
          const data = res.ok ? ((await res.json()) as { markets?: PublicMarket[] }) : { markets: [] };
          if (data.markets && data.markets.length > 0) list = data.markets;
        } catch {
          /* keep bundled markets so Delivering to still has a country list */
        }
        setMarkets(list);

        const manual = typeof window !== "undefined" && localStorage.getItem(MANUAL_KEY) === "true";
        const stored = readStoredCountry();
        const storedPostal = typeof window !== "undefined" ? localStorage.getItem(POSTAL_KEY) ?? "" : "";
        if (storedPostal) setPostalCode(storedPostal);

        if (manual && stored) {
          setManualOverride(true);
          setCountryCode(stored);
          applyCheckoutCurrency(stored, list);
          return;
        }

        setManualOverride(false);
        const detected = await detectVisitorCountry();
        const allowed = pickAllowedCountry(detected, list, stored || DEFAULT_MARKET_COUNTRY);
        setCountryCode(allowed);
        localStorage.setItem(COUNTRY_KEY, allowed);
        applyCheckoutCurrency(detected ?? allowed, list);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [applyCheckoutCurrency]);

  const resetToDetectedLocation = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(MANUAL_KEY);
    }
    setManualOverride(false);
    setLoading(true);
    try {
      const detected = await detectVisitorCountry();
      const allowed = pickAllowedCountry(detected, markets, DEFAULT_MARKET_COUNTRY);
      setCountryCode(allowed);
      localStorage.setItem(COUNTRY_KEY, allowed);
      applyCheckoutCurrency(detected ?? allowed, markets);
    } finally {
      setLoading(false);
    }
  }, [applyCheckoutCurrency, markets]);

  const checkServiceability = useCallback(
    async (productSlug?: string) => {
      const params = new URLSearchParams({ countryCode, postalCode });
      if (productSlug) params.set("productSlug", productSlug);
      try {
        const res = await fetch(`${getApiUrl()}/markets/serviceability?${params}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as Serviceability;
        setLastServiceability(data);
        return data;
      } catch {
        return null;
      }
    },
    [countryCode, postalCode]
  );

  const value = useMemo(
    () => ({
      countryCode,
      postalCode,
      markets,
      market,
      loading,
      manualOverride,
      setMarketLocation,
      resetToDetectedLocation,
      checkServiceability,
      lastServiceability,
    }),
    [
      countryCode,
      postalCode,
      markets,
      market,
      loading,
      manualOverride,
      setMarketLocation,
      resetToDetectedLocation,
      checkServiceability,
      lastServiceability,
    ]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used within MarketProvider");
  return ctx;
}
