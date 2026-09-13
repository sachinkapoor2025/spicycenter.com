/** Estimated visitor location from CDN edge headers (CloudFront on Amplify). */
export type ViewerGeo = {
  country?: string;
  region?: string;
  regionName?: string;
  city?: string;
};

const GEO_HEADER_KEYS: Record<keyof ViewerGeo, string[]> = {
  country: [
    "cloudfront-viewer-country",
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-country-code",
    "x-geo-country",
  ],
  city: ["cloudfront-viewer-city", "x-vercel-ip-city"],
  region: ["cloudfront-viewer-country-region", "x-vercel-ip-country-region"],
  regionName: ["cloudfront-viewer-country-region-name"],
};

function decodeGeoHeader(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.trim();
  }
}

function headerValue(headers: Record<string, string | undefined>, names: string[]): string | undefined {
  for (const name of names) {
    const direct = headers[name];
    if (direct) return decodeGeoHeader(direct);
    const lower = headers[name.toLowerCase()];
    if (lower) return decodeGeoHeader(lower);
  }
  return undefined;
}

/** Parse CloudFront / CDN geo headers (keys may be any casing). */
export function parseViewerGeoFromHeaders(
  headers: Record<string, string | undefined>
): ViewerGeo {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value) normalized[key.toLowerCase()] = value;
  }

  const country = headerValue(normalized, GEO_HEADER_KEYS.country)?.toUpperCase();
  const city = headerValue(normalized, GEO_HEADER_KEYS.city);
  const region = headerValue(normalized, GEO_HEADER_KEYS.region)?.toUpperCase();
  const regionName = headerValue(normalized, GEO_HEADER_KEYS.regionName);

  const geo: ViewerGeo = {};
  if (country && /^[A-Z]{2}$/.test(country)) geo.country = country;
  if (city) geo.city = city;
  if (region) geo.region = region;
  if (regionName) geo.regionName = regionName;
  return geo;
}

export function mergeViewerGeo(client: ViewerGeo, edge: ViewerGeo): ViewerGeo {
  return {
    country: client.country ?? edge.country,
    city: client.city ?? edge.city,
    region: client.region ?? edge.region,
    regionName: client.regionName ?? edge.regionName,
  };
}

/** Human-readable location for admin. */
export function formatViewerLocation(
  geo: ViewerGeo,
  hints?: { timezone?: string; locale?: string }
): string {
  const parts: string[] = [];
  if (geo.city) parts.push(geo.city);
  const regionLabel = geo.regionName ?? geo.region;
  if (regionLabel && regionLabel.toLowerCase() !== geo.city?.toLowerCase()) {
    parts.push(regionLabel);
  }
  if (geo.country) parts.push(geo.country);
  if (parts.length > 0) return parts.join(", ");

  const inferred = inferViewerCountryCode(geo, hints);
  if (inferred) return inferred;
  if (hints?.timezone) return hints.timezone;
  return "—";
}

/**
 * Best-effort ISO country for analytics pies.
 * Prefer CDN/geo country; otherwise infer from timezone/locale (same cues as Location column).
 */
export function inferViewerCountryCode(
  geo: ViewerGeo,
  hints?: { timezone?: string; locale?: string }
): string | undefined {
  if (geo.country && /^[A-Z]{2}$/i.test(geo.country)) {
    return geo.country.toUpperCase();
  }

  const tz = hints?.timezone ?? "";
  const locale = (hints?.locale ?? "").toLowerCase();

  if (tz.includes("Kolkata") || tz.includes("Calcutta") || locale.startsWith("en-in") || locale.startsWith("hi")) {
    return "IN";
  }
  if (tz.startsWith("Asia/Singapore") || locale.endsWith("-sg")) return "SG";
  if (tz.startsWith("Asia/Shanghai") || tz.startsWith("Asia/Chongqing") || tz.startsWith("Asia/Harbin")) {
    return "CN";
  }
  if (tz.startsWith("Asia/Hong_Kong")) return "HK";
  if (tz.startsWith("Asia/Tokyo")) return "JP";
  if (tz.startsWith("Asia/Dubai")) return "AE";
  if (tz.startsWith("Asia/Ho_Chi_Minh") || tz.startsWith("Asia/Saigon")) return "VN";
  if (tz.startsWith("Australia/") || locale.endsWith("-au")) return "AU";
  if (
    tz.startsWith("America/Toronto") ||
    tz.startsWith("America/Vancouver") ||
    tz.startsWith("America/Edmonton") ||
    tz.startsWith("America/Winnipeg") ||
    locale.endsWith("-ca")
  ) {
    return "CA";
  }
  if (tz.startsWith("America/") || locale.startsWith("en-us")) return "US";
  if (tz.startsWith("Europe/London") || locale.endsWith("-gb")) return "GB";
  if (tz.startsWith("Europe/")) return undefined; // don't guess a single EU country
  if (locale.startsWith("en-us")) return "US";
  if (locale.startsWith("en-in")) return "IN";

  return undefined;
}

export function viewerGeoFromMetadata(metadata?: Record<string, string>): ViewerGeo {
  if (!metadata) return {};
  return {
    country: metadata.country,
    city: metadata.city,
    region: metadata.region,
    regionName: metadata.regionName,
  };
}
