import {
  DEFAULT_USD_INR_RATE,
  completeUsdRates,
  fetchLiveUsdInrRate,
  fetchLiveUsdRates,
  resolveUsdInrRate,
  type ExchangeRateQuote,
} from "@spicycorner/shared";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — do not hit FX providers per request

let cache: (ExchangeRateQuote & { expiresAt: number }) | null = null;
let ratesCache: { rates: Record<string, number>; source: string; asOf: string; expiresAt: number } | null = null;

/** Round FX to 4 dp so display/checkout stay stable within the cache window. */
function stabilizeRate(rate: number): number {
  return Math.round(rate * 10_000) / 10_000;
}

function stabilizeRates(rates: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [code, value] of Object.entries(rates)) {
    if (value > 0) next[code] = stabilizeRate(value);
  }
  return next;
}

export async function getLiveUsdRates(): Promise<{
  rates: Record<string, number>;
  source: string;
  asOf: string;
}> {
  const now = Date.now();
  if (ratesCache && now < ratesCache.expiresAt) {
    return { rates: ratesCache.rates, source: ratesCache.source, asOf: ratesCache.asOf };
  }

  const live = await fetchLiveUsdRates();
  const rates = stabilizeRates(completeUsdRates(live?.rates));
  const quote = {
    rates,
    source: live?.source ?? "fallback",
    asOf: live?.asOf ?? new Date().toISOString(),
    expiresAt: now + CACHE_TTL_MS,
  };
  ratesCache = quote;
  return quote;
}

/** Live USD→INR with in-memory cache (Lambda container reuse). */
export async function getLiveUsdInrRate(): Promise<ExchangeRateQuote> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return { rate: cache.rate, source: cache.source, asOf: cache.asOf };
  }

  const envFallback = resolveUsdInrRate(process.env.USD_INR_RATE ?? process.env.NEXT_PUBLIC_USD_INR_RATE);
  const live = await fetchLiveUsdInrRate();

  const quote: ExchangeRateQuote = live
    ? { ...live, rate: stabilizeRate(live.rate) }
    : {
        rate: stabilizeRate(envFallback),
        source: "env-fallback",
        asOf: new Date().toISOString(),
      };

  cache = { ...quote, expiresAt: now + CACHE_TTL_MS };
  return quote;
}

/** Pick checkout rate: prefer live server quote; client rate only if within 3% (display sync). */
export async function resolveCheckoutUsdInrRate(clientRate?: number): Promise<number> {
  const quote = await getLiveUsdInrRate();
  if (clientRate && clientRate > 0) {
    const drift = Math.abs(clientRate - quote.rate) / quote.rate;
    if (drift <= 0.03) return clientRate;
  }
  return quote.rate;
}

export { DEFAULT_USD_INR_RATE };
