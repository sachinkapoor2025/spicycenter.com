import { BULK_PACK_SIZES } from "@/lib/catalogue";

export const productPageFaqs = [
  {
    q: "How is delivery handled?",
    a: "Worldwide delivery is arranged through the enquiry. This page does not show a delivery date.",
  },
  {
    q: "Which pack sizes can I request?",
    a: `${BULK_PACK_SIZES.join(", ")}. These are pack sizes, not prices. 1 metric ton is 1,000 kg.`,
  },
  {
    q: "Are prices shown here?",
    a: "No. This is a catalogue. Availability and price are confirmed when you enquire.",
  },
  {
    q: "Who can enquire?",
    a: "Importers, distributors, restaurants, hotels and other food businesses.",
  },
  {
    q: "Where is allergen and ingredient information?",
    a: "On the product record and legal pages. Multi-ingredient masalas must list ingredients and allergens before a shipment is agreed.",
  },
] as const;
