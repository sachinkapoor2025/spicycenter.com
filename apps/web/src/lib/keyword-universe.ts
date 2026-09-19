import { existsSync, readFileSync, createReadStream } from "fs";
import { join } from "path";
import { createGunzip } from "zlib";
import { createInterface } from "readline";
import { EUROPEAN_COUNTRY_CODES } from "@spicycorner/shared";

export type KeywordMarket = {
  name: string;
  slug: string;
  marketCode: string;
  recommendedContent: string;
  keywordCount: number;
  productCounts: Record<string, number>;
  intentCounts: Record<string, number>;
  sampleKeywords: string[];
};

export type KeywordProduct = {
  slug: string;
  name: string;
  keywordCount: number;
  countryCounts: Record<string, number>;
  intentCounts: Record<string, number>;
  sampleKeywords: string[];
};

export type KeywordUniverseMeta = {
  source: string;
  importedAt: string;
  keywordCount: number;
  validation: string;
  governance: { rule: string; guidance: string }[];
};

export type KeywordHit = {
  keyword: string;
  productSlug: string;
  intent: string;
  marketSlug: string;
  country: string;
  url: string;
};

function resolveUniversePath(name: string): string | null {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "data/keyword-universe", name),
    join(cwd, "../../data/keyword-universe", name),
    join(cwd, "../data/keyword-universe", name),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function readJson<T>(name: string, fallback: T): T {
  const path = resolveUniversePath(name);
  if (!path) return fallback;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function loadKeywordMarkets(): KeywordMarket[] {
  return readJson<KeywordMarket[]>("markets.json", []);
}

export function loadKeywordProducts(): KeywordProduct[] {
  return readJson<KeywordProduct[]>("products.json", []);
}

export function loadKeywordUniverseMeta(): KeywordUniverseMeta | null {
  return readJson<KeywordUniverseMeta | null>("meta.json", null);
}

export function getKeywordMarket(slug: string): KeywordMarket | undefined {
  return loadKeywordMarkets().find((m) => m.slug === slug);
}

export function getKeywordProduct(slug: string): KeywordProduct | undefined {
  return loadKeywordProducts().find((p) => p.slug === slug);
}

export function marketCanonicalPath(slug: string): string {
  return `/markets/${slug}`;
}

export function sourcingCanonicalPath(slug: string): string {
  return `/sourcing/${slug}`;
}

/** Existing shop/knowledge URLs for a workbook product — never invent rice/pulse SKUs. */
export function existingUrlsForProduct(productSlug: string): { href: string; label: string }[] {
  if (productSlug === "turmeric" || productSlug === "turmeric-powder") {
    return [
      { href: "/spice-guide/turmeric", label: "Turmeric spice guide" },
      { href: "/spices/turmeric", label: "Shop turmeric" },
      { href: "/wholesale/turmeric", label: "Turmeric wholesale" },
    ];
  }
  if (productSlug === "cumin-seeds" || productSlug === "cumin-powder") {
    return [
      { href: "/spice-guide/cumin", label: "Cumin spice guide" },
      { href: "/spices/cumin", label: "Shop cumin" },
      { href: "/wholesale/cumin", label: "Cumin wholesale" },
    ];
  }
  return [
    { href: "/wholesale", label: "Indian spice wholesale" },
    { href: "/spices", label: "Shop spices" },
    { href: "/bulk-enquiry", label: "100kg+ bulk enquiry" },
  ];
}

export function spiceQueryForProduct(productSlug: string): string {
  if (productSlug.startsWith("cumin")) return "cumin";
  if (productSlug.startsWith("turmeric")) return "turmeric";
  return "cumin";
}

export type MarketFulfilment = "retail_eu" | "bulk_quote" | "origin" | "enquiry";

const RETAIL_ISO: Record<string, string> = {
  uk: "GB",
  ireland: "IE",
  germany: "DE",
  france: "FR",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  belgium: "BE",
  austria: "AT",
  portugal: "PT",
  sweden: "SE",
  denmark: "DK",
  poland: "PL",
  finland: "FI",
  "czech-republic": "CZ",
};

export function marketFulfilment(slug: string): MarketFulfilment {
  if (slug === "india") return "origin";
  if (slug === "usa" || slug === "canada") return "bulk_quote";
  const iso = RETAIL_ISO[slug];
  if (iso && (EUROPEAN_COUNTRY_CODES as readonly string[]).includes(iso)) return "retail_eu";
  return "enquiry";
}

export function bulkDestinationQuery(slug: string): string | null {
  if (slug === "usa") return "US";
  if (slug === "canada") return "CA";
  if (slug === "uk") return "UK";
  if (marketFulfilment(slug) === "retail_eu") return "EU";
  return null;
}

export function existingCountryHub(slug: string): { href: string; label: string } | null {
  const map: Record<string, { href: string; label: string }> = {
    uk: { href: "/uk", label: "UK spice hub" },
    germany: { href: "/countries/de", label: "Germany delivery page" },
    france: { href: "/countries/fr", label: "France delivery page" },
    spain: { href: "/countries/es", label: "Spain delivery page" },
    italy: { href: "/countries/it", label: "Italy delivery page" },
    netherlands: { href: "/countries/nl", label: "Netherlands delivery page" },
    ireland: { href: "/countries/ie", label: "Ireland delivery page" },
    belgium: { href: "/countries/be", label: "Belgium delivery page" },
  };
  return map[slug] ?? null;
}

export function mapKeywordHit(row: {
  k: string;
  p: string;
  i: string;
  m: string;
  c: string;
}): KeywordHit {
  return {
    keyword: row.k,
    productSlug: row.p,
    intent: row.i,
    marketSlug: row.m,
    country: row.c,
    url: marketCanonicalPath(row.m),
  };
}

export async function searchKeywordUniverse(query: string, limit = 30): Promise<KeywordHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const gz = resolveUniversePath("keywords.jsonl.gz");
  if (!gz) return [];
  const hits: KeywordHit[] = [];
  const rl = createInterface({
    input: createReadStream(gz).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try {
      const row = JSON.parse(line) as { k: string; p: string; i: string; m: string; c: string };
      if (!row.k?.toLowerCase().includes(q)) continue;
      hits.push(mapKeywordHit(row));
      if (hits.length >= limit) break;
    } catch {
      /* skip bad line */
    }
  }
  return hits;
}
