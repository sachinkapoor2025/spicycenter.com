import { getKeywordMarket, loadKeywordProducts } from "@/lib/keyword-universe";

export const ME_MARKET_SLUGS = [
  "uae",
  "saudi-arabia",
  "qatar",
  "kuwait",
  "oman",
  "bahrain",
  "jordan",
  "israel",
  "turkey",
  "egypt",
  "morocco",
] as const;

export type MeMarketSlug = (typeof ME_MARKET_SLUGS)[number];

export type MePlaceKind = "country" | "state" | "city";

export type MePlace = {
  slug: string;
  name: string;
  kind: MePlaceKind;
  marketSlug: MeMarketSlug;
  parentSlug?: string;
  summary: string;
  buyerNote: string;
};

/** Commercial Middle East places only — not a worldwide city farm. */
export const ME_PLACES: MePlace[] = [
  {
    slug: "uae",
    name: "United Arab Emirates",
    kind: "country",
    marketSlug: "uae",
    summary:
      "UAE importers, hotels and grocers send free enquiries for Indian spices. We do not claim a Dubai warehouse or a guaranteed customs time.",
    buyerNote: "Name the emirate, kilos, whole or ground, and whether you need 10kg, 25kg or 50kg bags.",
  },
  {
    slug: "abu-dhabi",
    name: "Abu Dhabi",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary:
      "Abu Dhabi foodservice and wholesale buyers can request Indian cumin, turmeric and mixed spices from India. Specs are confirmed on the quote.",
    buyerNote: "Say if delivery is to the city, Mussafah, or another industrial area — we do not invent a local stock point.",
  },
  {
    slug: "dubai",
    name: "Dubai",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary:
      "Dubai is the busiest UAE enquiry hub for Indian spice importers, restaurants and hotel groups. Enquiry is free; cargo is not charged on this website.",
    buyerNote: "Jebel Ali, Al Quoz and hotel kitchens need different pack sizes — tell us yours. No invented Halal certificate list.",
  },
  {
    slug: "sharjah",
    name: "Sharjah",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary:
      "Sharjah manufacturers and distributors can source Indian spices in bulk. We quote from India; we do not list a Sharjah bonded warehouse.",
    buyerNote: "Include industrial area and whether you need whole seed or powder.",
  },
  {
    slug: "ajman",
    name: "Ajman",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary: "Ajman buyers use the same free UAE enquiry path. Transit and paperwork depend on the named lot.",
    buyerNote: "Minimum commercial wholesale on our forms starts at 10kg.",
  },
  {
    slug: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary: "Ras Al Khaimah food and manufacturing enquiries for Indian spices. No fake sailing date on this page.",
    buyerNote: "Tell us port preference only if you already have one.",
  },
  {
    slug: "fujairah",
    name: "Fujairah",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary: "Fujairah east-coast buyers can enquire for Indian spices. We will not invent a local MOQ.",
    buyerNote: "Name kilos and spice form on the free form.",
  },
  {
    slug: "umm-al-quwain",
    name: "Umm Al Quwain",
    kind: "state",
    marketSlug: "uae",
    parentSlug: "uae",
    summary: "Umm Al Quwain wholesale spice enquiries route through the UAE hub. Facts stay on the quote.",
    buyerNote: "Standard enquiry is free.",
  },
  {
    slug: "dubai-marina",
    name: "Dubai Marina",
    kind: "city",
    marketSlug: "uae",
    parentSlug: "dubai",
    summary:
      "Hotels and restaurants around Dubai Marina often ask for Indian spices for kitchens — not a retail door-drop promise.",
    buyerNote: "Use the free enquiry. 100kg+ cargo uses the bulk form.",
  },
  {
    slug: "downtown-dubai",
    name: "Downtown Dubai",
    kind: "city",
    marketSlug: "uae",
    parentSlug: "dubai",
    summary: "Downtown Dubai hospitality buyers can request Indian spices from India. We do not claim same-day hotel delivery.",
    buyerNote: "List dishes or spice names and pack size.",
  },
  {
    slug: "jebel-ali",
    name: "Jebel Ali",
    kind: "city",
    marketSlug: "uae",
    parentSlug: "dubai",
    summary:
      "Jebel Ali is where many UAE importers receive containers. This page is an enquiry hub, not a claim that we operate a terminal there.",
    buyerNote: "Say FOB or CIF only as a preference — Incoterm is confirmed on quote.",
  },
  {
    slug: "al-ain",
    name: "Al Ain",
    kind: "city",
    marketSlug: "uae",
    parentSlug: "abu-dhabi",
    summary: "Al Ain grocers and caterers can send a free Indian spice enquiry. Inland delivery is quoted per lot.",
    buyerNote: "We do not publish a fake inland haulage day-count.",
  },
  {
    slug: "saudi-arabia",
    name: "Saudi Arabia",
    kind: "country",
    marketSlug: "saudi-arabia",
    summary:
      "Saudi importers and food manufacturers can enquire for Indian spices. Certificate lists differ by port and are not invented here.",
    buyerNote: "Name Riyadh, Jeddah, Dammam or another city plus kilos.",
  },
  {
    slug: "riyadh",
    name: "Riyadh",
    kind: "city",
    marketSlug: "saudi-arabia",
    parentSlug: "saudi-arabia",
    summary: "Riyadh distributors and hotels request Indian spices as a free enquiry. We do not claim a Riyadh warehouse.",
    buyerNote: "Whole vs powder and bag size change the quote.",
  },
  {
    slug: "jeddah",
    name: "Jeddah",
    kind: "city",
    marketSlug: "saudi-arabia",
    parentSlug: "saudi-arabia",
    summary: "Jeddah is a common Red Sea entry for spice cargo. This page maps keywords to a free enquiry, not a berth booking.",
    buyerNote: "Ask on the form if you need documentation help — optional add-ons are not charged unless you choose them on a UK/EU 100kg+ quote.",
  },
  {
    slug: "dammam",
    name: "Dammam",
    kind: "city",
    marketSlug: "saudi-arabia",
    parentSlug: "saudi-arabia",
    summary: "Dammam and Eastern Province buyers can source Indian spices via enquiry. No invented HS duty table.",
    buyerNote: "List spices and monthly kilos if you know them.",
  },
  {
    slug: "mecca",
    name: "Mecca",
    kind: "city",
    marketSlug: "saudi-arabia",
    parentSlug: "saudi-arabia",
    summary: "Mecca foodservice enquiries for Indian spices. We do not invent pilgrimage-season stock we do not hold.",
    buyerNote: "Enquiry is free. Availability is confirmed per lot.",
  },
  {
    slug: "medina",
    name: "Medina",
    kind: "city",
    marketSlug: "saudi-arabia",
    parentSlug: "saudi-arabia",
    summary: "Medina buyers use the Saudi enquiry path for Indian spices. No local warehouse claim.",
    buyerNote: "Name pack size and spice form.",
  },
  {
    slug: "qatar",
    name: "Qatar",
    kind: "country",
    marketSlug: "qatar",
    summary: "Qatar hotels and importers can send a free Indian spice enquiry. Doha delivery is confirmed on quote.",
    buyerNote: "We do not invent a Qatar Halal stamp we cannot issue.",
  },
  {
    slug: "doha",
    name: "Doha",
    kind: "city",
    marketSlug: "qatar",
    parentSlug: "qatar",
    summary: "Doha foodservice and wholesale spice enquiries from India. No invented transit day.",
    buyerNote: "10kg+ wholesale or 100kg+ bulk — both forms are free to submit.",
  },
  {
    slug: "kuwait",
    name: "Kuwait",
    kind: "country",
    marketSlug: "kuwait",
    summary: "Kuwait importers can enquire for Indian spices. Papers differ by shipment.",
    buyerNote: "Name the spice, kilos and city of delivery.",
  },
  {
    slug: "kuwait-city",
    name: "Kuwait City",
    kind: "city",
    marketSlug: "kuwait",
    parentSlug: "kuwait",
    summary: "Kuwait City restaurants and distributors use a free enquiry. We do not list a local warehouse.",
    buyerNote: "Say whole or ground.",
  },
  {
    slug: "oman",
    name: "Oman",
    kind: "country",
    marketSlug: "oman",
    summary: "Oman buyers can request Indian spices. Muscat and Sohar preferences belong on the form, not as fake stock.",
    buyerNote: "Standard enquiry is free.",
  },
  {
    slug: "muscat",
    name: "Muscat",
    kind: "city",
    marketSlug: "oman",
    parentSlug: "oman",
    summary: "Muscat wholesale and hotel spice enquiries. No invented port rotation.",
    buyerNote: "Include kilos and spice names.",
  },
  {
    slug: "bahrain",
    name: "Bahrain",
    kind: "country",
    marketSlug: "bahrain",
    summary: "Bahrain grocers and caterers can enquire for Indian spices from India.",
    buyerNote: "We will not invent a Manama bonded store.",
  },
  {
    slug: "manama",
    name: "Manama",
    kind: "city",
    marketSlug: "bahrain",
    parentSlug: "bahrain",
    summary: "Manama foodservice spice enquiries. Quote confirms packing and origin for the lot.",
    buyerNote: "Free to submit.",
  },
  {
    slug: "jordan",
    name: "Jordan",
    kind: "country",
    marketSlug: "jordan",
    summary: "Jordan importers can send a free Indian spice enquiry. Aqaba vs Amman is a buyer detail, not a promise here.",
    buyerNote: "Name destination city and kilos.",
  },
  {
    slug: "amman",
    name: "Amman",
    kind: "city",
    marketSlug: "jordan",
    parentSlug: "jordan",
    summary: "Amman distributors and restaurants request Indian spices via enquiry.",
    buyerNote: "No invented certificate pack.",
  },
  {
    slug: "israel",
    name: "Israel",
    kind: "country",
    marketSlug: "israel",
    summary: "Israel buyers can enquire for Indian spices. Import rules are confirmed per lot, not invented on this page.",
    buyerNote: "Enquiry is free.",
  },
  {
    slug: "tel-aviv",
    name: "Tel Aviv",
    kind: "city",
    marketSlug: "israel",
    parentSlug: "israel",
    summary: "Tel Aviv food businesses can request Indian spices. We do not claim a local warehouse.",
    buyerNote: "List spices and pack size.",
  },
  {
    slug: "turkey",
    name: "Turkey",
    kind: "country",
    marketSlug: "turkey",
    summary: "Turkey importers can enquire for Indian spices. Istanbul and other cities are named on the form.",
    buyerNote: "We do not invent a Turkish Mersin stock.",
  },
  {
    slug: "istanbul",
    name: "Istanbul",
    kind: "city",
    marketSlug: "turkey",
    parentSlug: "turkey",
    summary: "Istanbul wholesale spice enquiries from India. Transit is quoted, not guessed.",
    buyerNote: "Free enquiry or 100kg+ bulk form.",
  },
  {
    slug: "egypt",
    name: "Egypt",
    kind: "country",
    marketSlug: "egypt",
    summary: "Egypt importers can request Indian spices. Alexandria vs Cairo is a delivery detail for the quote.",
    buyerNote: "No invented duty table.",
  },
  {
    slug: "cairo",
    name: "Cairo",
    kind: "city",
    marketSlug: "egypt",
    parentSlug: "egypt",
    summary: "Cairo distributors and manufacturers can send a free Indian spice enquiry.",
    buyerNote: "Name kilos and form.",
  },
  {
    slug: "alexandria",
    name: "Alexandria",
    kind: "city",
    marketSlug: "egypt",
    parentSlug: "egypt",
    summary: "Alexandria port-city buyers can enquire for Indian spices. We do not book vessels on this page.",
    buyerNote: "Standard enquiry is free.",
  },
  {
    slug: "morocco",
    name: "Morocco",
    kind: "country",
    marketSlug: "morocco",
    summary: "Morocco buyers can enquire for Indian spices. Casablanca delivery is confirmed on quote.",
    buyerNote: "We do not invent a local mill.",
  },
  {
    slug: "casablanca",
    name: "Casablanca",
    kind: "city",
    marketSlug: "morocco",
    parentSlug: "morocco",
    summary: "Casablanca importers and food factories can request Indian spices via a free form.",
    buyerNote: "List spices and monthly volume if known.",
  },
];

export function isMeMarketSlug(slug: string): slug is MeMarketSlug {
  return (ME_MARKET_SLUGS as readonly string[]).includes(slug);
}

export function getMePlace(slug: string): MePlace | undefined {
  return ME_PLACES.find((p) => p.slug === slug);
}

export function mePlacesByKind(kind: MePlaceKind): MePlace[] {
  return ME_PLACES.filter((p) => p.kind === kind);
}

export function meChildren(parentSlug: string): MePlace[] {
  return ME_PLACES.filter((p) => p.parentSlug === parentSlug);
}

export function meSiblings(place: MePlace): MePlace[] {
  return ME_PLACES.filter((p) => p.parentSlug === place.parentSlug && p.slug !== place.slug);
}

export function mePlacesForMarket(marketSlug: string): MePlace[] {
  return ME_PLACES.filter((p) => p.marketSlug === marketSlug);
}

/** Workbook-style phrases for a place — same 7 products × intents, not invented volumes. */
export function meWorkbookPhrases(place: MePlace, limit = 16): string[] {
  const market = getKeywordMarket(place.marketSlug);
  const products = loadKeywordProducts();
  const intents = market
    ? Object.keys(market.intentCounts).slice(0, 4)
    : ["bulk supplier", "wholesale supplier", "importer", "B2B supplier"];
  const out: string[] = [];
  for (const product of products) {
    for (const intent of intents) {
      out.push(`${product.name} ${intent} in ${place.name}`);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function meInternalLinks(place: MePlace): { href: string; label: string }[] {
  const links = [
    { href: `/markets/${place.marketSlug}`, label: `${getMePlace(place.marketSlug)?.name ?? place.name} market hub` },
    { href: "/guides/gcc-import", label: "GCC import notes" },
    { href: "/enquiry", label: "Free sourcing enquiry" },
    { href: "/bulk-enquiry", label: "100kg+ bulk enquiry" },
    { href: "/sourcing/turmeric", label: "Turmeric sourcing" },
    { href: "/sourcing/cumin-seeds", label: "Cumin sourcing" },
    { href: "/food", label: "Food families" },
    { href: "/middle-east", label: "All Middle East places" },
  ];
  const parent = place.parentSlug ? getMePlace(place.parentSlug) : undefined;
  if (parent) links.unshift({ href: `/middle-east/${parent.slug}`, label: parent.name });
  return links;
}
