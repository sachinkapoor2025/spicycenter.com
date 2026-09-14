import { ALL_SPICE_ENTITIES, getSpiceBySlug } from "./entities";
import type { BulkVariant, CatalogProduct, ComplianceRecord, MarketPrice, RecipeStub, RetailVariant, SpiceEntity, SpiceForm } from "./types";

export const BULK_MINIMUM_KG = 10;

const RETAIL_PACKS_G = [100, 200, 500, 1000, 2000, 5000] as const;
const BULK_PACKS_KG = [10, 25, 50, 100, 250] as const;

const FORM_LABEL: Record<SpiceForm, string> = {
  whole: "Whole",
  powder: "Powder",
  flakes: "Flakes",
  crushed: "Crushed",
  roasted: "Roasted",
  blend: "Blend",
  threads: "Threads",
  leaves: "Dried leaves",
  root: "Dried root",
};

const GRADE_LABEL: Record<string, string> = {
  premium: "Premium",
  standard: "Standard",
  "machine-cleaned": "Machine Cleaned",
  export: "Export Grade",
  garbled: "Garbled",
  ungarbled: "Ungarbled",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultCompliance(spice: SpiceEntity, form: SpiceForm, packLabel: string): ComplianceRecord {
  const singleIngredient = form !== "blend";
  return {
    ingredients: singleIngredient
      ? `${spice.canonicalName} (${spice.botanicalName})`
      : `See pack: ${spice.canonicalName} is a multi-ingredient blend. Full ingredients must be completed before sale.`,
    allergens: form === "blend" ? "May contain allergens from constituent spices — complete before sale." : "None declared — verify per lot (mustard, sesame, celery, and nuts may apply to some spices).",
    netQuantityLabel: packLabel,
    countryOfOrigin: spice.origin,
    placeOfPacking: "To be set per lot (India packing / UK importer as applicable)",
    packer: "To be set — responsible packer on label",
    importer: "UK/EU importer to be set before offering for sale",
    responsibleFoodBusinessOperator: "To be set — food business operator name and address",
    bestBeforeGuidance: "Best-before applies where the product is not highly perishable; print per lot.",
    storageConditions: spice.storage,
    usageInstructions: "Culinary ingredient. Use in cooking. Not a medicine.",
    nutritionInformation: "Nutrition declaration required for most prepacked foods in UK/EU — complete per SKU before sale.",
    certification: "None claimed unless an admin-verified certificate is attached.",
    ukImportStatus: "Review — certain dried spices from India may be subject to increased official controls.",
    euImportStatus: "Review — EU may apply risk-based increased controls on certain foods of non-animal origin.",
    requiredDocuments: ["Commercial invoice", "Packing list", "Food information file"],
    testingRequirements: ["Complete per spice category — pesticide, microbiological, aflatoxin, or residue tests as required"],
    lastComplianceReview: "2026-09-13",
    needsVerification: true,
  };
}

function indicativeRetailPriceInr(spice: SpiceEntity, form: SpiceForm, grade: string, grams: number): number {
  const basePerKg =
    spice.slug === "saffron"
      ? 180000
      : spice.category === "premium-spices"
        ? 2200
        : spice.category === "indian-chillies"
          ? 480
          : spice.category === "masalas"
            ? 620
            : 380;
  const formMul = form === "powder" || form === "roasted" ? 1.15 : 1;
  const gradeMul = grade === "premium" || grade === "garbled" || grade === "machine-cleaned" ? 1.2 : 1;
  const kgPrice = basePerKg * formMul * gradeMul;
  return Math.max(25, Math.round((kgPrice * grams) / 1000 / 5) * 5);
}

function indicativeBulkPerKg(spice: SpiceEntity, grade: string, kg: number): number {
  const retail1kg = indicativeRetailPriceInr(spice, spice.forms[0] ?? "whole", grade, 1000);
  const tier = kg >= 100 ? 0.72 : kg >= 50 ? 0.78 : kg >= 25 ? 0.84 : 0.9;
  return Math.round(retail1kg * tier);
}

function retailVariants(spice: SpiceEntity, form: SpiceForm, grade: string, productSlug: string): RetailVariant[] {
  const packs = spice.slug === "saffron" ? [1, 2, 5, 10] : [...RETAIL_PACKS_G];
  return packs.map((grams) => {
    const packLabel = grams >= 1000 ? `${grams / 1000}kg` : `${grams}g`;
    return {
      sku: `SC-R-${productSlug}-${grams}`.toUpperCase(),
      packLabel,
      weightGrams: grams,
      priceInr: indicativeRetailPriceInr(spice, form, grade, grams),
      inventory: 0,
      status: "draft" as const,
    };
  });
}

function bulkVariants(spice: SpiceEntity, grade: string, productSlug: string): BulkVariant[] {
  if (spice.slug === "saffron") {
    return [
      {
        sku: `SC-B-${productSlug}-1`.toUpperCase(),
        packLabel: "1kg (wholesale saffron — quote)",
        weightKg: 1,
        pricePerKgInr: indicativeBulkPerKg(spice, grade, 1),
        minKg: 1,
        status: "draft",
      },
    ];
  }
  return BULK_PACKS_KG.map((kg) => ({
    sku: `SC-B-${productSlug}-${kg}`.toUpperCase(),
    packLabel: `${kg}kg`,
    weightKg: kg,
    pricePerKgInr: indicativeBulkPerKg(spice, grade, kg),
    minKg: BULK_MINIMUM_KG,
    status: "draft" as const,
  }));
}

function productName(spice: SpiceEntity, varietyName: string, form: SpiceForm, grade: string): string {
  const gradeLabel = GRADE_LABEL[grade] ?? grade;
  const formLabel = FORM_LABEL[form];
  if (form === "blend") return `${gradeLabel} ${varietyName}`;
  if (varietyName.toLowerCase().includes(formLabel.toLowerCase())) return `${gradeLabel} ${varietyName}`;
  return `${gradeLabel} ${varietyName} — ${formLabel}`;
}

function buildProduct(spice: SpiceEntity, variety: { slug: string; name: string; region?: string }, form: SpiceForm, grade: string): CatalogProduct {
  const slug = slugify(`${variety.slug}-${form}-${grade}`);
  const name = productName(spice, variety.name, form, grade);
  const aliases = Array.from(
    new Set(
      [
        ...spice.aliases,
        spice.canonicalName,
        spice.hindiName,
        spice.botanicalName,
        variety.name,
        `${variety.name} ${form}`,
        `${spice.canonicalName} ${form}`,
        grade,
        `${spice.slug} ${BULK_PACKS_KG[0]}kg`,
        `${spice.slug} 25kg`,
      ].map((a) => a.toLowerCase())
    )
  );
  return {
    slug,
    name,
    spiceId: spice.id,
    spiceSlug: spice.slug,
    varietySlug: variety.slug,
    varietyName: variety.name,
    form,
    grade,
    category: spice.category,
    region: variety.region ?? spice.growingRegions[0],
    botanicalName: spice.botanicalName,
    hindiName: spice.hindiName,
    shortDescription: spice.shortDescription,
    description: spice.description,
    heatLevel: spice.heatLevel,
    flavourProfile: spice.flavourProfile,
    origin: spice.origin,
    retailVariants: retailVariants(spice, form, grade, slug),
    bulkVariants: bulkVariants(spice, grade, slug),
    bulkMinimumKg: spice.slug === "saffron" ? 1 : BULK_MINIMUM_KG,
    tags: [spice.category, form, grade, spice.heatLevel, ...(variety.region ? [variety.region] : [])],
    aliases,
    compliance: defaultCompliance(spice, form, "See selected pack"),
    seoTitle: `${name} | Indian spices UK & EU`,
    metaDescription: `Buy ${name} in retail packs or bulk from 10kg. ${spice.shortDescription} Indicative Indian market prices shown separately from selling prices.`,
    needsVerification: Boolean(spice.needsVerification) || true,
  };
}

let cachedProducts: CatalogProduct[] | null = null;

export function getCatalogProducts(): CatalogProduct[] {
  if (cachedProducts) return cachedProducts;
  const products: CatalogProduct[] = [];
  for (const spice of ALL_SPICE_ENTITIES) {
    const varieties = spice.varieties.length ? spice.varieties : [{ slug: spice.slug, name: spice.canonicalName }];
    for (const variety of varieties) {
      for (const form of spice.forms) {
        for (const grade of spice.grades) {
          products.push(buildProduct(spice, variety, form, grade));
        }
      }
    }
  }
  cachedProducts = products;
  return products;
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return getCatalogProducts().find((p) => p.slug === slug);
}

export function getProductsBySpice(spiceSlug: string): CatalogProduct[] {
  return getCatalogProducts().filter((p) => p.spiceSlug === spiceSlug);
}

export function getCategories(): { slug: string; name: string }[] {
  const names: Record<string, string> = {
    "whole-spices": "Whole Spices",
    "ground-spices": "Ground Spices",
    "indian-chillies": "Indian Chillies",
    seeds: "Seeds",
    herbs: "Herbs",
    roots: "Roots",
    barks: "Barks",
    "premium-spices": "Premium Spices",
    masalas: "Masalas",
    "speciality-spices": "Speciality Spices",
  };
  const slugs = [...new Set(getCatalogProducts().map((p) => p.category))];
  return slugs.map((slug) => ({ slug, name: names[slug] ?? slug.replace(/-/g, " ") }));
}

export function searchCatalog(query: string): {
  products: CatalogProduct[];
  spices: SpiceEntity[];
} {
  const q = query.trim().toLowerCase();
  if (!q) return { products: getCatalogProducts().slice(0, 24), spices: ALL_SPICE_ENTITIES.filter((s) => s.featured) };

  const bulkKg = q.match(/(\d+)\s*kg/);
  const wantsBulk = /\bbulk\b|\bwholesale\b|\b25kg\b|\b10kg\b|\b50kg\b/.test(q) || Boolean(bulkKg);

  const spices = ALL_SPICE_ENTITIES.filter((s) => {
    const hay = [s.canonicalName, s.hindiName, s.botanicalName, s.slug, ...s.aliases, ...s.commonNames, ...s.indianNames].join(" ").toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((part) => hay.includes(part));
  });

  let products = getCatalogProducts().filter((p) => {
    const hay = [p.name, p.slug, p.hindiName, p.botanicalName, ...p.aliases].join(" ").toLowerCase();
    return hay.includes(q) || spices.some((s) => s.slug === p.spiceSlug);
  });

  if (/\bpowder\b|\bground\b/.test(q)) products = products.filter((p) => p.form === "powder");
  if (/\bwhole\b|\bseeds\b/.test(q) && !/\bpowder\b/.test(q)) products = products.filter((p) => p.form === "whole" || p.form === "threads" || p.form === "leaves");
  if (wantsBulk) products.sort((a, b) => a.bulkMinimumKg - b.bulkMinimumKg);

  return { products, spices };
}

export const MARKET_PRICES: MarketPrice[] = [
  {
    spiceId: "cumin",
    spiceSlug: "cumin",
    spiceName: "Cumin",
    market: "Unjha",
    city: "Unjha",
    state: "Gujarat",
    grade: "Machine cleaned (indicative)",
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0,
    unit: "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Admin / Spices Board India (when imported)",
    sourceUrl: "https://www.indianspices.com/",
    notes: "Placeholder row. Do not treat as a live purchase price. Import official figures with date, market, and grade.",
  },
  {
    spiceId: "black-pepper",
    spiceSlug: "black-pepper",
    spiceName: "Black Pepper",
    market: "Cochin",
    city: "Kochi",
    state: "Kerala",
    grade: "Garbled (indicative)",
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0,
    unit: "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Spices Board India — import required before display of numbers",
    sourceUrl: "https://www.indianspices.com/",
    notes: "Board data distinguishes garbled/ungarbled pepper. Keep grades separate.",
  },
  {
    spiceId: "turmeric",
    spiceSlug: "turmeric",
    spiceName: "Turmeric",
    market: "Erode",
    city: "Erode",
    state: "Tamil Nadu",
    grade: "Finger (indicative)",
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0,
    unit: "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Admin entry pending",
    sourceUrl: "https://www.indianspices.com/",
    notes: "Awaiting verified market quote.",
  },
  {
    spiceId: "coriander",
    spiceSlug: "coriander",
    spiceName: "Coriander",
    market: "Kota / Gujarat markets",
    city: "Kota",
    state: "Rajasthan",
    grade: "Standard (indicative)",
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0,
    unit: "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Admin entry pending",
    sourceUrl: "https://www.indianspices.com/",
    notes: "Awaiting verified market quote.",
  },
  {
    spiceId: "green-cardamom",
    spiceSlug: "green-cardamom",
    spiceName: "Green Cardamom",
    market: "Cardamom auction (Kerala)",
    city: "Idukki / Kochi",
    state: "Kerala",
    grade: "Auction grade (indicative)",
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0,
    unit: "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Admin entry pending",
    sourceUrl: "https://www.indianspices.com/",
    notes: "Awaiting verified auction figure.",
  },
  {
    spiceId: "clove",
    spiceSlug: "clove",
    spiceName: "Clove",
    market: "Cochin",
    city: "Kochi",
    state: "Kerala",
    grade: "Standard (indicative)",
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0,
    unit: "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Admin entry pending",
    sourceUrl: "https://www.indianspices.com/",
    notes: "Awaiting verified market quote.",
  },
];

export const RECIPES: RecipeStub[] = [
  { slug: "jeera-rice", title: "Jeera Rice", dishType: "Rice", spiceSlugs: ["cumin"], summary: "Basmati tempered with whole cumin seeds." },
  { slug: "dal-tadka", title: "Dal Tadka", dishType: "Dal", spiceSlugs: ["cumin", "turmeric", "asafoetida"], summary: "Lentils finished with ghee tadka." },
  { slug: "biryani", title: "Biryani", dishType: "Biryani", spiceSlugs: ["green-cardamom", "black-cumin", "mace", "clove"], summary: "Layered rice using whole garam spices." },
  { slug: "chai", title: "Masala Chai", dishType: "Tea", spiceSlugs: ["green-cardamom", "ginger", "cinnamon", "clove"], summary: "Milk tea with whole spices." },
  { slug: "sambar", title: "Sambar", dishType: "South Indian", spiceSlugs: ["sambar-masala", "tamarind", "mustard", "curry-leaf"], summary: "Lentil-vegetable stew with tamarind." },
  { slug: "curry", title: "Everyday Indian Curry", dishType: "Curry", spiceSlugs: ["cumin", "coriander", "turmeric", "kashmiri-chilli"], summary: "Base masala of cumin, coriander, turmeric, and chilli." },
];

export const REGIONS = [
  { slug: "kerala", name: "Kerala", spices: ["black-pepper", "green-cardamom", "cinnamon", "clove", "nutmeg", "mace", "ginger", "turmeric"] },
  { slug: "rajasthan", name: "Rajasthan", spices: ["cumin", "coriander", "fenugreek", "ajwain", "mathania-chilli"] },
  { slug: "gujarat", name: "Gujarat", spices: ["cumin", "coriander", "fennel", "sesame", "mustard"] },
  { slug: "karnataka", name: "Karnataka", spices: ["byadgi-chilli", "black-pepper", "coriander"] },
  { slug: "andhra-pradesh", name: "Andhra Pradesh", spices: ["guntur-sannam", "guntur-teja", "turmeric"] },
  { slug: "tamil-nadu", name: "Tamil Nadu", spices: ["ramnad-mundu", "curry-leaf", "turmeric"] },
  { slug: "kashmir", name: "Kashmir", spices: ["kashmiri-chilli", "saffron", "black-cumin", "fennel"] },
  { slug: "maharashtra", name: "Maharashtra", spices: ["sankeshwari-chilli", "goda-masala", "kolhapuri-masala"] },
];

export const COMPARISONS = [
  { slug: "cumin-vs-black-cumin", a: "cumin", b: "black-cumin", title: "Cumin vs Black Cumin" },
  { slug: "cumin-vs-caraway", a: "cumin", b: "caraway", title: "Cumin vs Caraway" },
  { slug: "cinnamon-vs-cassia", a: "cinnamon", b: "cassia", title: "Cinnamon vs Cassia" },
  { slug: "green-cardamom-vs-black-cardamom", a: "green-cardamom", b: "black-cardamom", title: "Green Cardamom vs Black Cardamom" },
  { slug: "kashmiri-chilli-vs-byadgi-chilli", a: "kashmiri-chilli", b: "byadgi-chilli", title: "Kashmiri Chilli vs Byadgi Chilli" },
  { slug: "guntur-chilli-vs-teja-chilli", a: "guntur-sannam", b: "guntur-teja", title: "Guntur Sannam vs Teja Chilli" },
  { slug: "garam-masala-vs-curry-powder", a: "garam-masala", b: "madras-curry-powder", title: "Garam Masala vs Curry Powder" },
];

export function relatedProducts(product: CatalogProduct, limit = 6): CatalogProduct[] {
  return getCatalogProducts()
    .filter((p) => p.slug !== product.slug && (p.spiceSlug === product.spiceSlug || getSpiceBySlug(product.spiceSlug)?.relatedSlugs.includes(p.spiceSlug)))
    .slice(0, limit);
}

export { getSpiceBySlug, ALL_SPICE_ENTITIES, FORM_LABEL, GRADE_LABEL };
