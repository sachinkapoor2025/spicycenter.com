/** Map CJ Dropshipping category names onto SpicyCenter storefront slugs. */

const RULES: Array<{ slug: string; needles: string[] }> = [
  {
    slug: "indian-chillies",
    needles: ["chilli", "chili", "pepper", "paprika", "capsicum"],
  },
  {
    slug: "indian-masalas",
    needles: ["masala", "curry powder", "seasoning blend", "spice mix"],
  },
  {
    slug: "ground-spices",
    needles: ["powder", "ground", "turmeric", "cumin powder"],
  },
  {
    slug: "seeds",
    needles: ["seed", "mustard", "fenugreek", "fennel", "sesame"],
  },
  {
    slug: "dried-herbs",
    needles: ["herb", "leaf", "kasuri", "fenugreek leaf"],
  },
  {
    slug: "whole-spices",
    needles: ["spice", "cumin", "coriander", "cardamom", "cinnamon", "clove", "star anise"],
  },
];

export const CJ_SPICE_KEYWORDS = [
  "cumin",
  "turmeric",
  "chilli",
  "cardamom",
  "cinnamon",
  "coriander",
  "garam masala",
  "peppercorn",
] as const;

export function mapCjCategoryToStoreSlug(input: {
  oneCategoryName?: string;
  twoCategoryName?: string;
  threeCategoryName?: string;
  categoryName?: string;
  productName?: string;
}): string {
  const hay = [
    input.threeCategoryName,
    input.twoCategoryName,
    input.oneCategoryName,
    input.categoryName,
    input.productName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const rule of RULES) {
    if (rule.needles.some((n) => hay.includes(n))) return rule.slug;
  }
  return "whole-spices";
}

export function gramsToOz(grams: number): number | undefined {
  if (!Number.isFinite(grams) || grams <= 0) return undefined;
  return Math.round((grams / 28.3495) * 100) / 100;
}

export function mmToInches(mm: number): number | undefined {
  if (!Number.isFinite(mm) || mm <= 0) return undefined;
  return Math.round((mm / 25.4) * 100) / 100;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
