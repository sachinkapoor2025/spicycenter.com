/** Map CJ Dropshipping category names onto SpicyCorner storefront slugs. */

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
