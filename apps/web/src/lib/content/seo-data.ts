import keywordsData from "./seo-keywords.data.json";
import locationsData from "./seo-locations.data.json";
import blogData from "./seo-blog-posts.data.json";
import eventsData from "./seo-events.data.json";

export interface SeoCategoryPrimary {
  title: string;
  description: string;
  h1: string;
  alt: string;
  primaryKeyword: string;
}

export interface SeoLocation {
  slug: string;
  label: string;
  region: "city" | "state";
  state: string | null;
  areas: string[];
  regionName: string;
  seasonalNote: string;
  keywords: string[];
  title: string;
  description: string;
  h1: string;
  primaryKeyword: string;
}

export interface SeoBlogEntry {
  slug: string;
  title: string;
  keyword: string;
  relatedKeywords: string[];
  relatedCategory: string;
  description: string;
  excerpt: string;
}

export interface SeoEventsHub {
  hubPath: string;
  disclaimer: string;
  keywordsBySubcategory: Record<string, string[]>;
  relatedProductCategories: { label: string; href: string }[];
}

export const seoCoreKeywords = keywordsData.core as string[];
export const seoInformationalKeywords = keywordsData.informational as string[];
export const seoProductKeywordsByTarget = keywordsData.productByTarget as Record<string, string[]>;
export const seoCategoryPrimary = keywordsData.categoryPrimary as Record<string, SeoCategoryPrimary>;
export const seoAttractionKeywords = keywordsData.attractionsBySubcategory as Record<string, string[]>;

export const seoLocations = locationsData as SeoLocation[];
export const seoBlogEntries = blogData as SeoBlogEntry[];
export const seoEventsHub = eventsData as SeoEventsHub;

const locationBySlug = new Map(seoLocations.map((l) => [l.slug, l]));

export function getSeoLocation(slug: string): SeoLocation | undefined {
  return locationBySlug.get(slug);
}

export function allSeoLocationSlugs(): string[] {
  return seoLocations.map((l) => l.slug);
}

export function locationPublicPath(slug: string): string {
  return `/cities/${slug}`;
}

export function getSeoBlogEntry(slug: string): SeoBlogEntry | undefined {
  return seoBlogEntries.find((b) => b.slug === slug);
}

export function productKeywordsForCategory(slug: string): string[] {
  return seoProductKeywordsByTarget[slug] ?? [];
}

export function categoryKeywordsMeta(slug: string, limit = 12): string {
  const primary = seoCategoryPrimary[slug];
  const kws = productKeywordsForCategory(slug).slice(0, limit);
  const seed = primary ? [primary.primaryKeyword, primary.h1] : [];
  return [...new Set([...seed, ...kws, "SpicyCorner", "spicycenter.com"])].join(", ");
}

export function cityKeywordsMeta(slug: string): string {
  const loc = getSeoLocation(slug);
  if (!loc) return "SpicyCorner, Indian spices UK";
  return [...loc.keywords.slice(0, 10), "SpicyCorner", "spicycenter.com"].join(", ");
}
