/** Culinary Arabic names for storefront display. Overlay only — does not rewrite spices.json. */
export const SPICE_ARABIC_NAMES: Record<string, string> = {
  cumin: "الكمون",
  turmeric: "الكركم",
  "black-pepper": "الفلفل الأسود",
  "green-cardamom": "الهيل الأخضر",
  coriander: "الكزبرة",
  "kashmiri-chilli": "الفلفل الكشميري",
  saffron: "الزعفران",
  clove: "القرنفل",
  cassia: "القرفة",
  cinnamon: "القرفة",
  fenugreek: "الحلبة",
  fennel: "الشمر",
  mustard: "الخردل",
  "black-cardamom": "الهيل الأسود",
};

export function displayArabicName(slug: string): string {
  return SPICE_ARABIC_NAMES[slug] ?? "";
}
