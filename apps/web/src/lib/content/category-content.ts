/** Extended SEO content per category — shown below product listings. */
export interface CategoryContent {
  extraParagraphs: string[];
  sections?: { heading: string; paragraphs: string[] }[];
}

export const categoryContent: Record<string, CategoryContent> = {
  "whole-spices": {
    extraParagraphs: [
      "Whole Indian spices — cumin, coriander, cardamom, cloves, cinnamon, peppercorns — keep aroma longer than pre-ground powder. Buy retail packs for home cooking or 10kg+ for wholesale.",
      "Indicative Indian market prices on this site are not invoice prices. Confirm pack size, origin, and shipping on the product page.",
    ],
    sections: [
      {
        heading: "How to use whole spices",
        paragraphs: [
          "Temper whole seeds in hot oil or ghee at the start of a curry.",
          "Grind small batches so powder stays fragrant.",
          "Store airtight, away from light and steam.",
        ],
      },
    ],
  },
  "ground-spices": {
    extraParagraphs: [
      "Ground turmeric, chilli powder, coriander, and garam masala are everyday kitchen staples. Choose pack sizes that you will finish while the aroma is still strong.",
    ],
  },
  "indian-chillies": {
    extraParagraphs: [
      "Kashmiri, Byadgi, Guntur and other Indian chillies differ in colour, heat, and use. This is culinary information, not a medical claim.",
    ],
  },
  "indian-masalas": {
    extraParagraphs: [
      "Blended masalas such as garam masala, sambar, and kitchen king are for cooking. Check ingredients on the pack and food-information fields on the product page.",
    ],
  },
  "bulk-spices": {
    extraParagraphs: [
      "Wholesale starts at 10kg. UK shipping is a configurable per-kilogram rate. Duty and VAT are separate unless a shipping rule says they are included.",
    ],
  },
  spices: {
    extraParagraphs: [
      "SpicyCenter sells Indian spices for retail and wholesale. Browse whole spices, ground spices, chillies, masalas, and bulk packs.",
    ],
  },
};

export function getCategoryContent(slug: string): CategoryContent | undefined {
  return categoryContent[slug];
}
