import { headers } from "next/headers";
import { displayCurrencyForCountry, parseViewerGeoFromHeaders, type ViewerGeo } from "@spicycorner/shared";
import { lookupCountryFromIp, publicClientIp } from "@/lib/ip-geo";

export type GeoSource = "header" | "ip" | "default";

type CachedGeo = ViewerGeo & { country: string; source: GeoSource };

const GEO_TTL_MS = 10 * 60 * 1000;
const geoCache = new Map<string, { expires: number; value: CachedGeo }>();

/** Full geo from CDN headers, then public-IP lookup when those headers are absent. */
export async function detectViewerGeo(): Promise<CachedGeo> {
  const h = await headers();
  const ip = publicClientIp(h) ?? "";
  const record: Record<string, string> = {};
  h.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  const geo = parseViewerGeoFromHeaders(record);
  const cacheKey = `${ip}|${geo.country}|${geo.city ?? ""}`;
  const cached = geoCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const remember = (value: CachedGeo): CachedGeo => {
    if (!value.country) return value;
    geoCache.set(cacheKey, { expires: Date.now() + GEO_TTL_MS, value });
    if (geoCache.size > 400) {
      const oldest = geoCache.keys().next().value;
      if (oldest) geoCache.delete(oldest);
    }
    return value;
  };
  if (geo.country) return remember({ ...geo, country: geo.country, source: "header" });

  if (ip) {
    const fromIp = await lookupCountryFromIp(ip);
    if (fromIp) return remember({ ...geo, country: fromIp, source: "ip" });
  }

  const host = (h.get("host") ?? "").toLowerCase();
  const loopback = host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("[::1]");
  if (loopback) {
    const fromCaller = await lookupCountryFromIp("");
    if (fromCaller) return remember({ ...geo, country: fromCaller, source: "ip" });
  }

  return remember({ ...geo, country: "", source: "default" });
}

/** ISO 3166-1 alpha-2 country from CDN / edge headers (CloudFront on Amplify). */
export async function detectViewerCountry(): Promise<string> {
  const geo = await detectViewerGeo();
  return geo.country;
}

/** Map visitor country to default storefront display currency. */
export function defaultCurrencyForCountry(country: string) {
  return displayCurrencyForCountry(country);
}
