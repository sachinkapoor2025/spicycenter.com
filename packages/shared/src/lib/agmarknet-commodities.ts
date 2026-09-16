export const AGMARKNET_SOURCE_DISCLAIMER =
  "Data sourced from Agmarknet/data.gov.in. Prices as reported by respective markets; not independently verified.";

export const AGMARKNET_RESOURCE_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

export const AGMARKNET_SECRET_NAME = "agmarknet/api-key";

export const DEFAULT_BULK_MIN_QTY_KG = 100;
export const DEFAULT_SHIPPING_INR_PER_KG_UK = 750;
export const DEFAULT_CLEARANCE_CHARGE_INR = 15000;
export const DEFAULT_TESTING_CHARGE_INR = 6000;
export const DEFAULT_MARKUP_PERCENT = 15;
export const DEFAULT_SAMPLE_FEE_GBP = 9;
export const DEFAULT_DOCUMENTATION_FEE_GBP = 29;
export const DEFAULT_SAMPLE_FEE_EUR = 11;
export const DEFAULT_DOCUMENTATION_FEE_EUR = 34;
export const CLEARANCE_CHARGE_INR_MIN = 10000;
export const CLEARANCE_CHARGE_INR_MAX = 20000;

export type TrackedCommodity = {
  slug: string;
  spiceId: string;
  spiceName: string;
  /** Exact commodity string sent to data.gov.in filters[commodity] */
  agmarknetName: string;
};

/** Easy to extend — one row per spice we track on Agmarknet. */
export const TRACKED_COMMODITIES: TrackedCommodity[] = [
  { slug: "turmeric", spiceId: "turmeric", spiceName: "Turmeric", agmarknetName: "Turmeric" },
  { slug: "cumin", spiceId: "cumin", spiceName: "Cumin", agmarknetName: "Cumin" },
  { slug: "coriander", spiceId: "coriander", spiceName: "Coriander", agmarknetName: "Coriander" },
  { slug: "chilli", spiceId: "dried-red-chilli", spiceName: "Chilli", agmarknetName: "Chilli" },
  { slug: "black-pepper", spiceId: "black-pepper", spiceName: "Black pepper", agmarknetName: "Black pepper" },
  { slug: "cardamom", spiceId: "green-cardamom", spiceName: "Cardamom", agmarknetName: "Cardamom" },
  { slug: "fenugreek", spiceId: "fenugreek", spiceName: "Fenugreek", agmarknetName: "Fenugreek" },
  { slug: "clove", spiceId: "clove", spiceName: "Clove", agmarknetName: "Clove" },
  { slug: "mustard", spiceId: "mustard", spiceName: "Mustard", agmarknetName: "Mustard" },
  { slug: "fennel", spiceId: "fennel", spiceName: "Fennel", agmarknetName: "Fennel" },
];

export function findTrackedCommodity(input: string): TrackedCommodity | undefined {
  const n = input.trim().toLowerCase().replace(/\s+/g, "-");
  return TRACKED_COMMODITIES.find(
    (c) =>
      c.slug === n ||
      c.spiceId === n ||
      c.agmarknetName.toLowerCase() === input.trim().toLowerCase() ||
      c.spiceName.toLowerCase() === input.trim().toLowerCase()
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
