/**
 * Home-page-only curated product lists (names + preferred slugs).
 * Does not affect category pages, shop, search, or PDP.
 */
import type { Product } from "@spicycorner/shared";
import { homeCategoryOrder } from "@/lib/site";

type HomeCategorySlug = (typeof homeCategoryOrder)[number];

type HomeProductRef = {
  name: string;
  slug?: string;
};

function normalizeProductLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[''`′’]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[|–—−]/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(name: string): string[] {
  const stop = new Set(["a", "an", "and", "for", "the", "with", "indian", "spice", "spices"]);
  return normalizeProductLabel(name)
    .split(" ")
    .filter((w) => w.length > 2 && !stop.has(w));
}

export const HOME_CATEGORY_PRODUCTS: Record<HomeCategorySlug, HomeProductRef[]> = {
  "whole-spices": [],
  "ground-spices": [],
  "indian-chillies": [],
  seeds: [],
  herbs: [],
  "indian-masalas": [],
  "premium-spices": [],
  "bulk-spices": [],
};

function findUnusedMatch(
  products: Product[],
  unused: Set<string>,
  ref: HomeProductRef
): Product | undefined {
  if (ref.slug) {
    const bySlug = products.find((p) => p.slug === ref.slug && unused.has(p.slug));
    if (bySlug) return bySlug;
  }

  const target = normalizeProductLabel(ref.name);
  const exact = products.find((p) => unused.has(p.slug) && normalizeProductLabel(p.name) === target);
  if (exact) return exact;

  const words = significantWords(ref.name);
  if (words.length >= 3) {
    const fuzzy = products.find((p) => {
      if (!unused.has(p.slug)) return false;
      const hay = normalizeProductLabel(p.name);
      return words.every((w) => hay.includes(w));
    });
    if (fuzzy) return fuzzy;
  }

  return undefined;
}

export function pickHomeCategoryProducts(products: Product[], categorySlug: string): Product[] {
  const refs = HOME_CATEGORY_PRODUCTS[categorySlug as HomeCategorySlug];
  if (!refs?.length) return [];

  const unused = new Set(products.map((p) => p.slug));
  const ordered: Product[] = [];

  for (const ref of refs) {
    const match = findUnusedMatch(products, unused, ref);
    if (!match) continue;
    ordered.push(match);
    unused.delete(match.slug);
  }

  return ordered;
}
