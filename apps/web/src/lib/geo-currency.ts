import { headers } from "next/headers";
import { displayCurrencyForCountry, parseViewerGeoFromHeaders, type ViewerGeo } from "@spicycorner/shared";
import { lookupCountryFromIp, publicClientIp } from "@/lib/ip-geo";

export type GeoSource = "header" | "ip" | "default";

/** Full geo from CDN headers, then public-IP lookup when those headers are absent. */
export async function detectViewerGeo(): Promise<ViewerGeo & { country: string; source: GeoSource }> {
  const h = await headers();
  const record: Record<string, string> = {};
  h.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  const geo = parseViewerGeoFromHeaders(record);
  if (geo.country) return { country: geo.country, source: "header", ...geo };

  const ip = publicClientIp(h);
  if (ip) {
    const fromIp = await lookupCountryFromIp(ip);
    if (fromIp) return { country: fromIp, source: "ip", ...geo };
  }

  return { country: "US", source: "default", ...geo };
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
