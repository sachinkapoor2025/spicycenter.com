export const AGMARKNET_SOURCE_DISCLAIMER =
  "Data sourced from Agmarknet/data.gov.in. Prices as reported by respective markets; not independently verified.";

export const AGMARKNET_RESOURCE_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

export const AGMARKNET_SECRET_NAME = "agmarknet/api-key";

export const DEFAULT_BULK_MIN_QTY_KG = 100;
export const DEFAULT_SHIPPING_INR_PER_KG_UK = 750;
export const DEFAULT_CLEARANCE_CHARGE_INR = 15000;
export const DEFAULT_TESTING_CHARGE_INR = 6000;
/** Placeholder packaging/desiccant supplier cost — confirm before going live. */
export const DEFAULT_DESICCANT_FEE_STANDARD_INR = 2000;
/** Placeholder packaging/desiccant supplier cost — confirm before going live. */
export const DEFAULT_DESICCANT_FEE_HIGH_INR = 4000;
export const DEFAULT_MARKUP_PERCENT = 15;
export const DEFAULT_SAMPLE_FEE_GBP = 29;
export const DEFAULT_DOCUMENTATION_FEE_GBP = 29;
export const DEFAULT_SAMPLE_FEE_EUR = 11;
export const DEFAULT_DOCUMENTATION_FEE_EUR = 34;
export const CLEARANCE_CHARGE_INR_MIN = 10000;
export const CLEARANCE_CHARGE_INR_MAX = 20000;

export type TrackedCommodity = {
  slug: string;
  spiceId: string;
  spiceName: string;
  /** Exact commodity string sent first to data.gov.in filters[commodity] */
  agmarknetName: string;
  /** Additional Agmarknet labels tried if the primary name returns no rows */
  agmarknetAliases?: string[];
};

/** Easy to extend — one row per spice we track on Agmarknet. */
export const TRACKED_COMMODITIES: TrackedCommodity[] = [
  { slug: "turmeric", spiceId: "turmeric", spiceName: "Turmeric", agmarknetName: "Turmeric" },
  {
    slug: "cumin",
    spiceId: "cumin",
    spiceName: "Cumin",
    agmarknetName: "Cummin Seed(Jeera)",
    agmarknetAliases: ["Cumin", "Cumin Seed"],
  },
  {
    slug: "coriander",
    spiceId: "coriander",
    spiceName: "Coriander",
    agmarknetName: "Coriander",
    agmarknetAliases: ["Corriander seed"],
  },
  { slug: "chilli", spiceId: "dried-red-chilli", spiceName: "Chilli", agmarknetName: "Chilli", agmarknetAliases: ["Dry Chillies"] },
  { slug: "black-pepper", spiceId: "black-pepper", spiceName: "Black pepper", agmarknetName: "Black pepper" },
  {
    slug: "cardamom",
    spiceId: "green-cardamom",
    spiceName: "Cardamom",
    agmarknetName: "Cardamoms",
    agmarknetAliases: ["Cardamom"],
  },
  {
    slug: "fenugreek",
    spiceId: "fenugreek",
    spiceName: "Fenugreek",
    agmarknetName: "Methi Seeds",
    agmarknetAliases: ["Fenugreek"],
  },
  {
    slug: "clove",
    spiceId: "clove",
    spiceName: "Clove",
    agmarknetName: "Cloves",
    agmarknetAliases: ["Clove"],
  },
  { slug: "mustard", spiceId: "mustard", spiceName: "Mustard", agmarknetName: "Mustard" },
  {
    slug: "fennel",
    spiceId: "fennel",
    spiceName: "Fennel",
    agmarknetName: "Soanf",
    agmarknetAliases: ["Fennel", "Fennel Seed"],
  },
  { slug: "ginger", spiceId: "ginger", spiceName: "Ginger", agmarknetName: "Ginger" },
  { slug: "garlic", spiceId: "garlic", spiceName: "Garlic", agmarknetName: "Garlic" },
  { slug: "nutmeg", spiceId: "nutmeg", spiceName: "Nutmeg", agmarknetName: "Nutmeg" },
  {
    slug: "tamarind",
    spiceId: "tamarind",
    spiceName: "Tamarind",
    agmarknetName: "Tamarind",
  },
  {
    slug: "ajwain",
    spiceId: "ajwain",
    spiceName: "Ajwain",
    agmarknetName: "Ajwan",
    agmarknetAliases: ["Ajwain"],
  },
];

export function agmarknetFilterNames(c: TrackedCommodity): string[] {
  return [...new Set([c.agmarknetName, ...(c.agmarknetAliases ?? [])])];
}

export function findTrackedCommodity(input: string): TrackedCommodity | undefined {
  const raw = input.trim();
  const n = raw.toLowerCase().replace(/\s+/g, "-");
  return TRACKED_COMMODITIES.find(
    (c) =>
      c.slug === n ||
      c.spiceId === n ||
      c.spiceName.toLowerCase() === raw.toLowerCase() ||
      agmarknetFilterNames(c).some((name) => name.toLowerCase() === raw.toLowerCase())
  );
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(t);
}

export const BULK_QUOTE_DISCLAIMER =
  "Indicative estimate based on today's reference pricing. UK import duty (0-8%, payable by importer) not included. Final quote confirmed by our team. Reference pricing sourced from Agmarknet/data.gov.in and not independently verified.";
