export type FoodFamily = {
  slug: string;
  name: string;
  summary: string;
  inCatalog: boolean;
  examples: string[];
};

/** Enquiry hubs for vegetarian food families. SKUs are not invented. */
export const FOOD_FAMILIES: FoodFamily[] = [
  {
    slug: "rice",
    name: "Rice",
    summary: "Basmati and other Indian rice varieties for importers and wholesalers.",
    inCatalog: false,
    examples: ["Basmati rice", "Non-basmati rice", "Sona Masuri"],
  },
  {
    slug: "basmati-rice",
    name: "Basmati rice",
    summary: "Long-grain basmati sourcing enquiries. Grade and crop year are confirmed on quote.",
    inCatalog: false,
    examples: ["1121", "Pusa", "Traditional basmati"],
  },
  {
    slug: "pulses",
    name: "Pulses",
    summary: "Indian pulses, lentils and beans for food distributors.",
    inCatalog: false,
    examples: ["Toor", "Moong", "Chana", "Urad"],
  },
  {
    slug: "lentils",
    name: "Lentils",
    summary: "Lentil sourcing from India. Specs and packing are not invented on this page.",
    inCatalog: false,
    examples: ["Masoor", "Moong dal", "Toor dal"],
  },
  {
    slug: "beans",
    name: "Beans",
    summary: "Dried beans for wholesale and food manufacturing.",
    inCatalog: false,
    examples: ["Rajma", "Black beans", "Chickpeas"],
  },
  {
    slug: "makhana",
    name: "Makhana (fox nuts)",
    summary: "Fox nut / makhana bulk sourcing and packaging enquiries.",
    inCatalog: false,
    examples: ["Raw makhana", "Roasted makhana"],
  },
  {
    slug: "grains",
    name: "Grains",
    summary: "Indian food grains for export enquiry. Availability is confirmed per lot.",
    inCatalog: false,
    examples: ["Wheat", "Millets"],
  },
  {
    slug: "millets",
    name: "Millets",
    summary: "Millet sourcing enquiries for food brands and distributors.",
    inCatalog: false,
    examples: ["Pearl millet", "Finger millet", "Foxtail millet"],
  },
  {
    slug: "seeds",
    name: "Seeds",
    summary: "Culinary seeds. Many seed spices are already in the live spice catalogue.",
    inCatalog: true,
    examples: ["Cumin", "Mustard", "Sesame", "Fenugreek"],
  },
  {
    slug: "dry-fruits",
    name: "Dry fruits and nuts",
    summary: "Vegetarian dry fruit and nut sourcing enquiries. Not listed as retail SKUs today.",
    inCatalog: false,
    examples: ["Cashew", "Almond", "Raisin"],
  },
];

export function getFoodFamily(slug: string): FoodFamily | undefined {
  return FOOD_FAMILIES.find((f) => f.slug === slug);
}
