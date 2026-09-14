/**
 * Unpackaged spice photography (Wikimedia Commons) mapped onto SKUs.
 * Not branded retail packs — loose seed, rhizome, chilli or mixed masala heaps.
 */

const DEFAULT_IMAGE = "/images/spices/mixed.jpg";

/** Longer / more specific needles first. */
const NEEDLES: [string, string][] = [
  ["black cumin", "cumin"],
  ["kala jeera", "cumin"],
  ["green cardamom", "green-cardamom"],
  ["black cardamom", "black-cardamom"],
  ["white pepper", "white-pepper"],
  ["black pepper", "black-pepper"],
  ["long pepper", "black-pepper"],
  ["kashmiri", "chilli"],
  ["byadgi", "chilli"],
  ["guntur", "chilli"],
  ["sannam", "chilli"],
  ["teja", "chilli"],
  ["bhut jolokia", "chilli"],
  ["mundu", "chilli"],
  ["jwala", "chilli"],
  ["kanthari", "chilli"],
  ["resham", "chilli"],
  ["mathania", "chilli"],
  ["star anise", "star-anise"],
  ["bay leaf", "bay"],
  ["curry leaf", "curry-leaf"],
  ["dried ginger", "ginger"],
  ["galangal", "ginger"],
  ["poppy", "poppy"],
  ["sesame", "sesame"],
  ["nigella", "nigella"],
  ["kalonji", "nigella"],
  ["ajwain", "ajwain"],
  ["asafoetida", "asafoetida"],
  ["hing", "asafoetida"],
  ["tamarind", "tamarind"],
  ["amchur", "amchur"],
  ["mustard", "mustard"],
  ["fenugreek", "fenugreek"],
  ["methi", "fenugreek"],
  ["fennel", "fennel"],
  ["saunf", "fennel"],
  ["coriander", "coriander"],
  ["dhania", "coriander"],
  ["turmeric", "turmeric"],
  ["haldi", "turmeric"],
  ["cardamom", "green-cardamom"],
  ["elaichi", "green-cardamom"],
  ["cinnamon", "cinnamon"],
  ["cassia", "cinnamon"],
  ["dalchini", "cinnamon"],
  ["clove", "clove"],
  ["laung", "clove"],
  ["nutmeg", "nutmeg"],
  ["mace", "mace"],
  ["saffron", "saffron"],
  ["cumin", "cumin"],
  ["jeera", "cumin"],
  ["pepper", "black-pepper"],
  ["chilli", "chilli"],
  ["chili", "chilli"],
  ["mirch", "chilli"],
  ["garlic", "garlic"],
  ["mint", "mint"],
  ["masala", "masala"],
  ["curry powder", "masala"],
  ["rasam", "masala"],
  ["sambar", "masala"],
  ["caraway", "cumin"],
  ["anise", "fennel"],
  ["dill", "fennel"],
  ["celery", "mustard"],
  ["kokum", "tamarind"],
  ["cubeb", "black-pepper"],
];

export function spiceStockImagePath(haystack: string): string {
  const hay = haystack.toLowerCase();
  for (const [needle, file] of NEEDLES) {
    if (hay.includes(needle)) return `/images/spices/${file}.jpg`;
  }
  return DEFAULT_IMAGE;
}

export function spiceStockImagesForProduct(product: {
  slug?: string;
  name?: string;
  categorySlug?: string;
  tags?: string[];
}): string[] {
  const hay = [product.slug, product.name, product.categorySlug, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  return [spiceStockImagePath(hay)];
}
