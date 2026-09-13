export const site = {
  name: "SpicyCorner",
  domain: "spicycenter.com",
  tagline: "Authentic Indian Spices — Retail & Bulk Supply",
  description:
    "SpicyCorner is an Indian spice marketplace and reference site: retail packs, 10kg+ wholesale, spice knowledge, and indicative Indian market prices. Sourced from India's spice-growing regions for customers in the United Kingdom and the European Union.",
  supportEmail: "support@spicycenter.com",
  phone: "",
  whatsapp: "919266467887",
  whatsappDisplay: "",
  logoSrc: "/logo.svg",
  primaryColor: "#2c1810",
  navBlue: "#c45c26",
  accentColor: "#d4a017",
} as const;

export const STORE_LOCATIONS = [
  {
    id: "uk",
    flag: "🇬🇧",
    country: "United Kingdom",
    lines: ["5 Exeter Road", "Southampton, Hampshire", "SO18 2ED", "United Kingdom"],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=5+Exeter+Road%2C+Southampton+SO18+2ED",
  },
  {
    id: "in",
    flag: "🇮🇳",
    country: "India",
    lines: ["House No. 392", "Mohalla Sodian Wala", "Ferozepur City, Punjab 152002", "India"],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=House+No.+392%2C+Mohalla+Sodian+Wala%2C+Ferozepur+City%2C+Punjab+152002",
  },
] as const;

export const navItems = [
  { label: "Shop Spices", href: "/spices" },
  { label: "Bulk & Wholesale", href: "/wholesale" },
  { label: "Spice Guide", href: "/spice-guide" },
  { label: "Indian Spices", href: "/indian-spice-regions" },
  { label: "Masalas", href: "/spices/indian-masalas" },
  { label: "Recipes", href: "/recipes" },
  { label: "Spice Market Prices", href: "/spice-market-prices" },
  { label: "About", href: "/about" },
] as const;

export const regionLinks = [
  { label: "Kerala", slug: "kerala" },
  { label: "Rajasthan", slug: "rajasthan" },
  { label: "Gujarat", slug: "gujarat" },
  { label: "Karnataka", slug: "karnataka" },
  { label: "Andhra Pradesh", slug: "andhra-pradesh" },
  { label: "Tamil Nadu", slug: "tamil-nadu" },
  { label: "Kashmir", slug: "kashmir" },
  { label: "Maharashtra", slug: "maharashtra" },
] as const;

/** @deprecated spice city doorway pages — kept so old imports compile; not used in nav. */
export type CityLink = { label: string; slug: string };
export const cityLinks: CityLink[] = [];

export const homeBanners = [
  {
    src: "",
    alt: "Wooden spice counter with cumin, turmeric, cardamom, chilli, coriander, pepper, cinnamon, cloves and saffron",
    href: "/spices",
    eyebrow: "YOUR INDIAN SPICE CORNER",
    title: "THE WORLD OF",
    titleAccent: "INDIAN SPICES",
    description:
      "Authentic Indian spices sourced from India's spice-growing regions — available in retail packs and bulk quantities.",
    cta: "Shop spices",
    pill: "Retail 100g–5kg · Bulk from 10kg",
  },
] as const;

export const promoBanners = homeBanners;

export const exploreCategories = [
  { slug: "whole-spices", name: "Whole Spices", href: "/spices/whole-spices" },
  { slug: "ground-spices", name: "Ground Spices", href: "/spices/ground-spices" },
  { slug: "indian-chillies", name: "Indian Chillies", href: "/spices/indian-chillies" },
  { slug: "seeds", name: "Seeds", href: "/spices/seeds" },
  { slug: "herbs", name: "Herbs", href: "/spices/herbs" },
  { slug: "indian-masalas", name: "Masalas", href: "/spices/indian-masalas" },
  { slug: "premium-spices", name: "Premium Spices", href: "/spices/premium-spices" },
  { slug: "bulk-spices", name: "Bulk Spices", href: "/bulk-spices" },
] as const;

export const packSizes = ["100g", "200g", "500g", "1kg", "5kg", "10kg", "25kg", "50kg+"] as const;

export const homeCategoryOrder = exploreCategories.map((c) => c.slug);

export const categoryOrder = [...homeCategoryOrder] as const;

export function orderCategories<T extends { slug: string }>(categories: readonly T[]): T[] {
  const rank = new Map<string, number>(homeCategoryOrder.map((slug, index) => [slug, index]));
  return [...categories].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
}

export function whatsappChatUrl(message = "Hi SpicyCorner, I have a question about Indian spices."): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const testimonials = [] as const;

export const faqs = [
  {
    q: "What is the minimum bulk order?",
    a: "Wholesale starts at 10kg per bulk line. Larger bags (25kg, 50kg, 100kg+) and custom quantities can be quoted.",
  },
  {
    q: "Is the Indian market price what I pay?",
    a: "No. Indicative Indian market prices are reference data with date, market, grade and source. Your invoice is the retail or wholesale selling price plus shipping and any tax/duty that applies.",
  },
  {
    q: "How is UK shipping calculated?",
    a: "Shipping is configurable. The default UK rule is ₹750 per kg of shipment weight with a 1kg minimum chargeable weight. That figure does not include UK import duty or VAT unless we explicitly configure those as included.",
  },
  {
    q: "Do you ship to the EU?",
    a: "The EU is a planned market. Country rates, VAT and food-information rules must be configured before we accept EU checkouts for that country.",
  },
  {
    q: "Why do some spices need extra documents?",
    a: "Certain dried spices from India can face increased official controls in the UK and EU. We track that in compliance fields rather than hiding it.",
  },
  {
    q: "Can I buy cumin as jeera or Cuminum cyminum?",
    a: "Yes. Search understands English, Hindi, botanical names and pack sizes such as 25kg.",
  },
] as const;
