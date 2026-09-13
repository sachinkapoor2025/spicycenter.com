/**
 * Approximate country centroids for admin live-visitor map (not GPS).
 * ISO-3166-1 alpha-2 → [lat, lng]
 */
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8, -98.5],
  IN: [22.0, 79.0],
  GB: [54.0, -2.0],
  CA: [56.1, -106.3],
  AU: [-25.3, 133.8],
  DE: [51.2, 10.5],
  FR: [46.2, 2.2],
  AE: [23.4, 53.8],
  SG: [1.35, 103.8],
  NZ: [-40.9, 174.9],
  JP: [36.2, 138.3],
  KR: [36.5, 127.9],
  CN: [35.9, 104.2],
  BR: [-14.2, -51.9],
  MX: [23.6, -102.5],
  ZA: [-30.6, 22.9],
  NG: [9.1, 8.7],
  KE: [-0.0, 37.9],
  EG: [26.8, 30.8],
  SA: [23.9, 45.1],
  QA: [25.4, 51.2],
  KW: [29.3, 47.5],
  PK: [30.4, 69.3],
  BD: [23.7, 90.4],
  LK: [7.9, 80.8],
  NP: [28.4, 84.1],
  MY: [4.2, 101.9],
  TH: [15.9, 100.9],
  ID: [-2.5, 118.0],
  PH: [12.9, 121.8],
  VN: [14.1, 108.3],
  IT: [41.9, 12.6],
  ES: [40.5, -3.7],
  NL: [52.1, 5.3],
  BE: [50.5, 4.5],
  SE: [60.1, 18.6],
  NO: [60.5, 8.5],
  DK: [56.3, 9.5],
  FI: [61.9, 25.7],
  IE: [53.1, -8.2],
  CH: [46.8, 8.2],
  AT: [47.5, 14.6],
  PL: [51.9, 19.1],
  PT: [39.4, -8.2],
  GR: [39.1, 21.8],
  TR: [38.9, 35.2],
  RU: [61.5, 105.3],
  UA: [48.4, 31.2],
  IL: [31.0, 34.9],
  AR: [-38.4, -63.6],
  CL: [-35.7, -71.5],
  CO: [4.6, -74.3],
  PE: [-9.2, -75.0],
  HK: [22.3, 114.2],
  TW: [23.7, 121.0],
};

function hashJitter(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Map country (+ optional city) to approximate lat/lng for the live visitors graph. */
export function approxGeoCoords(input: {
  country?: string | null;
  city?: string | null;
  region?: string | null;
}): { lat: number; lng: number } {
  const cc = (input.country ?? "").trim().toUpperCase();
  const base = COUNTRY_CENTROIDS[cc] ?? [20, 0];
  const seed = `${cc}|${input.city ?? ""}|${input.region ?? ""}`;
  const j1 = hashJitter(seed);
  const j2 = hashJitter(seed + "#");
  // Spread visitors in the same city slightly so dots don't stack perfectly.
  const lat = Math.max(-85, Math.min(85, base[0] + (j1 - 0.5) * 6));
  const lng = Math.max(-180, Math.min(180, base[1] + (j2 - 0.5) * 8));
  return { lat, lng };
}
