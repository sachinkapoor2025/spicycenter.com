/**
 * Unpackaged spice photography (Wikimedia Commons) mapped onto SKUs.
 * Not branded retail packs — loose seed, rhizome, chilli or mixed masala heaps.
 */

const DEFAULT_IMAGE = "/images/spices/mixed.jpg";

/** Longer / more specific needles first. */
const NEEDLES: [string, string][] = [
  ["black cumin", "black-cumin"],
  ["kala jeera", "black-cumin"],
  ["green cardamom", "green-cardamom"],
  ["black cardamom", "black-cardamom"],
  ["white pepper", "white-pepper"],
  ["black pepper", "black-pepper"],
  ["long pepper", "long-pepper"],
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
  ["garam masala", "garam-masala"],
  ["chaat masala", "chaat-masala"],
  ["biryani masala", "biryani-masala"],
  ["tandoori masala", "tandoori-masala"],
  ["butter chicken", "butter-chicken-masala"],
  ["tikka masala", "tikka-masala"],
  ["chicken masala", "chicken-masala"],
  ["meat masala", "meat-masala"],
  ["fish masala", "fish-masala"],
  ["kitchen king", "kitchen-king"],
  ["chole masala", "chole-masala"],
  ["rajma masala", "rajma-masala"],
  ["pav bhaji", "pav-bhaji-masala"],
  ["sambar", "sambar-masala"],
  ["rasam", "rasam-powder"],
  ["vindaloo", "vindaloo-masala"],
  ["korma", "korma-masala"],
  ["chettinad", "chettinad-masala"],
  ["goda masala", "goda-masala"],
  ["kolhapuri", "kolhapuri-masala"],
  ["malvani", "malvani-masala"],
  ["panch phoron", "panch-phoron"],
  ["pickle masala", "pickle-masala"],
  ["tea masala", "tea-masala"],
  ["curry masala", "curry-masala"],
  ["masala", "garam-masala"],
  ["cumin", "cumin"],
  ["jeera", "cumin"],
  ["pepper", "black-pepper"],
  ["chilli", "chilli"],
  ["chili", "chilli"],
  ["mirch", "chilli"],
  ["garlic", "garlic"],
  ["mint", "mint"],
  ["blend", "garam-masala"],
  ["curry powder", "curry-masala"],
  ["caraway", "cumin"],
  ["anise", "fennel"],
  ["dill", "fennel"],
  ["celery", "mustard"],
  ["kokum", "tamarind"],
  ["cubeb", "black-pepper"],
];

/** What the unsuffixed stock photo actually shows. */
const POWDER_PHOTOS = new Set(["turmeric", "asafoetida"]);
const LEAF_PHOTOS = new Set(["bay", "curry-leaf", "mint"]);

type PhotoForm = "whole" | "powder" | "leaves" | "blend";

function photoFormOf(file: string): PhotoForm {
  if (
    file.endsWith("-masala") ||
    file === "kitchen-king" ||
    file === "rasam-powder" ||
    file === "panch-phoron"
  ) {
    return "blend";
  }
  if (LEAF_PHOTOS.has(file)) return "leaves";
  if (POWDER_PHOTOS.has(file)) return "powder";
  return "whole";
}

function wantedPhotoForm(form: string | undefined, hay: string): PhotoForm | undefined {
  const tagged = form?.toLowerCase();
  if (tagged === "powder" || tagged === "crushed" || tagged === "flakes") return "powder";
  if (tagged === "leaves") return "leaves";
  if (tagged === "blend") return "blend";
  if (tagged === "whole" || tagged === "seeds" || tagged === "roasted") return "whole";
  if (/\b(powder|crushed|flakes)\b/.test(hay)) return "powder";
  if (/\bleaf\b|\bleaves\b/.test(hay)) return "leaves";
  if (/\b(whole|seeds?)\b/.test(hay)) return "whole";
  return undefined;
}

function formImage(file: string, want: PhotoForm): string {
  if (want === "blend") return `/images/spices/${file}.jpg`;
  if (want === "powder" && file === "chilli") return "/images/spices/chilli-powder.jpg";
  if (want === "whole" && LEAF_PHOTOS.has(file)) return `/images/spices/${file}.jpg`;
  if (want === "powder" && photoFormOf(file) === "blend") return `/images/spices/${file}.jpg`;
  return `/images/spices/${file}-${want}.jpg`;
}

export function spiceStockImagePath(haystack: string, form?: string): string {
  const hay = haystack.toLowerCase().replace(/-/g, " ");
  const want = wantedPhotoForm(form, hay);
  for (const [needle, file] of NEEDLES) {
    if (!hay.includes(needle)) continue;
    if (!want || want === photoFormOf(file)) return `/images/spices/${file}.jpg`;
    return formImage(file, want);
  }
  return DEFAULT_IMAGE;
}

export function spiceStockImagesForProduct(product: {
  slug?: string;
  name?: string;
  categorySlug?: string;
  tags?: string[];
}): string[] {
  const form = product.tags?.find((tag) => tag.startsWith("form:"))?.slice(5);
  const hay = [product.slug, product.name, product.categorySlug, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  return [spiceStockImagePath(hay, form)];
}
