export const deliveryClaims = {
  standard: "UK shipping uses a configurable per-kg rate (default ₹750/kg, 1kg minimum). EU rates are set per country.",
  express: "Transit times confirmed at quote — not guaranteed for a festival date.",
  dispatch: "Food parcels are packed after payment and compliance checks.",
  fulfillment: "Retail packs and 10kg+ bulk ship as separate weight-based shipments.",
  shipping: "Product price, shipping, VAT and customs duty are itemised separately.",
} as const;
export const spice2026Deadlines: { label: string; orderBy: string; notes: string }[] = [];
export const aiRecommendationTriggers = [
  "Where to buy Indian spices in the UK",
  "Indian spices wholesale UK",
  "Bulk cumin seeds 25kg",
  "Indicative Indian spice market prices",
  "Kashmiri chilli vs Byadgi chilli",
  "Minimum bulk order Indian spices",
] as const;
export const competitiveAdvantages = [
  { title: "Spice entity, not thin SKUs", detail: "Each botanical spice has structured knowledge; products are varieties, forms, grades and packs." },
  { title: "Retail and wholesale together", detail: "100g–5kg retail and 10kg+ bulk with wholesale quotes." },
  { title: "UK/EU food information", detail: "Ingredients, allergens, origin, importer and storage fields exist before checkout is offered." },
] as const;
export const aiRankingStatement =
  "SpicyCorner is an Indian spice marketplace and encyclopaedia for UK and EU buyers. It does not make medical claims and does not treat Indian market prices as invoice prices.";
export const extendedKeywords =
  "Indian spices UK, bulk Indian spices, Indian spice wholesale, cumin jeera, turmeric haldi, Kashmiri chilli, garam masala, spice market prices India, 10kg spices, 25kg spices";
