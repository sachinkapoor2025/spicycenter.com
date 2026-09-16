export const site = {
  name: "SpicyCenter",
  domain: "spicycenter.com",
  tagline: "Authentic Indian Spices — Retail & Bulk Supply",
  description:
    "SpicyCenter is an Indian spice marketplace and reference site: retail packs, 10kg+ wholesale, spice knowledge, and indicative Indian market prices. Sourced from India's spice-growing regions for customers in the United Kingdom and the European Union.",
  supportEmail: "enquiry@spicycenter.com",
  phone: "",
  whatsapp: "919266467887",
  whatsappDisplay: "",
  logoSrc: "/brand-logo.jpg",
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
  { label: "Bulk & Wholesale", href: "/bulk-enquiry" },
  { label: "Spice Guide", href: "/spice-guide" },
  { label: "Indian Spices", href: "/indian-spice-regions" },
  { label: "Masalas", href: "/spices/indian-masalas" },
  { label: "Recipes", href: "/recipes" },
  { label: "Journal", href: "/journal" },
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

export const regionStories: Record<
  (typeof regionLinks)[number]["slug"],
  { intro: string; growing: string; cooking: string; climate: string; harvest: string }
> = {
  kerala:
    {
      intro: "Kerala’s humid hills and backwaters are the story behind black pepper, cardamom, clove and cinnamon-adjacent trade spices that still define South Indian kitchens.",
      growing: "Cardamom from the Western Ghats, Tellicherry-style pepper, and coconut-rich masala traditions sit alongside Syrian-Christian and Malabar Muslim cooking. Lots labelled Kerala should match the pack, not a generic ‘South India’ claim.",
      cooking: "Use Kerala pepper in fish moilee, cardamom in payasam, and a light hand with clove in biryani. Whole spices toasted in coconut oil give a different aroma than the same spices bloomed in ghee.",
      climate: "Tropical monsoon, high humidity, Western Ghat elevation for cardamom and pepper gardens. Mould risk in storage is why drying and packing quality matter as much as the district name.",
      harvest: "Pepper and cardamom follow Ghat harvest calendars (typically staggered through the dry months after monsoon, varying by elevation). Clove is a tree spice with its own picking window. We will not stamp a fake ‘picked this Tuesday’ date on every SKU.",
    },
  rajasthan:
    {
      intro: "Rajasthan is cumin, coriander and chilli country — dry heat, sandy soils and the mandis that still set the tone for North Indian everyday masala.",
      growing: "Jeera from the western belt and coriander seed from adjoining growing districts are traded through Unjha and other markets. Grade, sieve size and oil content matter more than a state name on a brochure.",
      cooking: "Rajasthani kitchens lean on cumin tadka, red chilli, and coriander in laal maas, ker sangri and dal baati. Toast jeera until it smells nutty, not burnt.",
      climate: "Arid to semi-arid. Seed spices like cumin prefer the winter growing cycle rather than a Kerala-style monsoon garden.",
      harvest: "Cumin and coriander are typically winter–spring harvest stories in western India. Mathania-style chilli is a Rajasthan colour-heat story — confirm variety on the pack.",
    },
  gujarat:
    {
      intro: "Gujarat sits on coriander, cumin and chilli trade routes. Unjha is one of the names buyers still look for when they talk about seed spices.",
      growing: "Coriander and cumin lots from Gujarat should be described by market, harvest and cleaning grade. Colour of coriander (yellow vs green) is a buying note, not a health claim.",
      cooking: "Gujarati cooking uses coriander-cumin (dhana jeeru), mild chilli and a sweet-sour balance. Ground coriander goes into undhiyu, dal, and everyday shaak.",
      climate: "Dry winters suited to cumin and coriander; coastal humidity is a different food culture (undhiyu, thepla) more than a different botany.",
      harvest: "Seed-spice harvest aligns with the Rajasthan–Gujarat winter crop. Unjha is a trading reference, not a guarantee printed on every 100g tin.",
    },
  karnataka:
    {
      intro: "Karnataka links the pepper and coffee hills of the Western Ghats with Byadgi chilli country and a strong temple-and-home rasam tradition.",
      growing: "Byadgi chilli is prized for colour more than heat. Pepper gardens overlap Kerala’s Ghats. Always read the variety on the pack rather than assuming ‘Karnataka chilli’ means one flavour.",
      cooking: "Byadgi for red hue in bisi bele bath, pepper in saaru, and curry leaves with mustard in palya. Whole spices are usually tempered in oil at the start.",
      climate: "Ghat rainfall for pepper; drier Deccan pockets for chilli. Byadgi is a named chilli, not a climate slogan.",
      harvest: "Byadgi chilli is picked and dried in seasonal waves. Colour value varies by lot — we do not invent ASTA colour numbers.",
    },
  "andhra-pradesh":
    {
      intro: "Andhra and Telangana chilli — Guntur, Sannam, and related lots — are the heat backbone of many Indian masalas sold into the UK.",
      growing: "Guntur is a trade name as much as a geography. Heat (SHU) and colour value vary by lot. We will not invent Scoville numbers we have not measured.",
      cooking: "Andhra meals often want a brighter, hotter chilli than Kashmiri. Use it in gongura, chicken fry, and pickle masalas; blend with Kashmiri if you need colour without the same bite.",
      climate: "Hot Deccan growing conditions. Irrigation and variety (Sannam, Teja, S4, S10) change the pack more than a state outline on a map.",
      harvest: "Chilli harvests are staggered. Dried red chilli for export is a processing chain (drying, stemming, grading), not a single village snapshot.",
    },
  "tamil-nadu":
    {
      intro: "Tamil Nadu is turmeric, curry leaf, tamarind-adjacent cooking and a distinct sambar-rasam spice logic.",
      growing: "Erode turmeric is a common reference grade in Indian trade. Curcumin content belongs on a lab sheet, not as a medical promise on a product page.",
      cooking: "Mustard, urad dal, curry leaf, red chilli and asafoetida in tadka; sambar powder built from coriander, chilli, toor dal and fenugreek. Toast powders briefly so they stay fragrant.",
      climate: "Tropical, with distinct turmeric-growing belts. Curry leaf is a kitchen tree more than a bulk field crop in many homes.",
      harvest: "Turmeric is lifted, boiled or steamed, and dried — processing defines the finger more than a tourist harvest photo. Mundu and other Tamil chillies are separate SKUs.",
    },
  kashmir:
    {
      intro: "Kashmiri chilli is famous for brick-red colour and milder heat. Saffron, when genuine, is a tiny, expensive thread crop — not a bulk commodity.",
      growing: "Kashmiri chilli lots should not be confused with generic ‘deggi’ blends. Saffron must be Crocus sativus stigmas with origin stated; we do not sell dyed fibres as saffron.",
      cooking: "Use Kashmiri chilli for tandoori colour and rogan josh. Bloom saffron in warm milk for biryani and sweets. A pinch is a seasoning, not a health tonic.",
      climate: "Temperate valley conditions for saffron crocus; chilli is a different crop often associated with the Kashmiri name in trade even when grown more widely — read the lot.",
      harvest: "Saffron stigmas are picked in a short autumn window. Kashmiri chilli drying is a separate calendar. Neither is a 25kg ‘always in season’ fairy tale without inventory to match.",
    },
  maharashtra:
    {
      intro: "Maharashtra sits between Deccan chilli, goda masala, and the Mumbai-Pune grocer demand that still shapes what UK Indian kitchens cook every week.",
      growing: "Turmeric, chilli and mixed spice blending for goda masala and kala masala are the regional story. Blends are recipes, not single-origin spices.",
      cooking: "Goda masala for amti, kala masala for rassa, and a daily tadka of mustard, cumin and asafoetida. Maharashtrian heat is often layered rather than one chilli dumped in.",
      climate: "Deccan plateau heat plus a humid Konkan coast (Malvani, Kolhapuri). Coastal coconut-chilli cooking is not the same as Nashik or Marathwada chilli lots.",
      harvest: "Chilli and turmeric follow regional harvests; goda masala is blended year-round from dried spices. Kolhapuri and Malvani masalas are recipes — ingredient lists must be completed before sale.",
    },
};

/** @deprecated spice city doorway pages — kept so old imports compile; not used in nav. */
export type CityLink = { label: string; slug: string };
export const cityLinks: CityLink[] = [];

export const homeBanners = [
  {
    src: "/images/banner-1.jpg",
    alt: "Authentic Indian spices from our farms to your kitchen — SpicyCenter",
    href: "/spices",
  },
  {
    src: "/images/banner-2.jpg",
    alt: "Spices for a better tomorrow — SpicyCenter whole and ground Indian spices",
    href: "/spices",
  },
  {
    src: "/images/banner-3.jpg",
    alt: "SpicyCenter Indian spices — shop retail packs and bulk",
    href: "/spices",
  },
] as const;

export const promoBanners = homeBanners;

export const exploreCategories = [
  { slug: "whole-spices", name: "Whole Spices", href: "/spices/whole-spices", image: "/images/cat-0.jpg" },
  { slug: "ground-spices", name: "Ground Spices", href: "/spices/ground-spices", image: "/images/cat-1.jpg" },
  { slug: "indian-masalas", name: "Blended Masalas", href: "/spices/indian-masalas", image: "/images/cat-2.jpg" },
  { slug: "herbs", name: "Herbs & Seasonings", href: "/spices/herbs", image: "/images/cat-3.jpg" },
  { slug: "seeds", name: "Seeds & Grains", href: "/spices/seeds", image: "/images/cat-4.jpg" },
  { slug: "indian-chillies", name: "Dried Ingredients", href: "/spices/indian-chillies", image: "/images/cat-5.jpg" },
  { slug: "premium-spices", name: "Premium Range", href: "/spices/premium-spices", image: "/images/cat-6.jpg" },
  { slug: "bulk-spices", name: "Bulk Spices", href: "/bulk-spices", image: "/images/cat-7.jpg" },
] as const;

export const packSizes = ["100g", "200g", "500g", "1kg", "5kg", "10kg", "25kg", "50kg+"] as const;

export const homeCategoryOrder = exploreCategories.map((c) => c.slug);

export const categoryOrder = [...homeCategoryOrder] as const;

export function orderCategories<T extends { slug: string }>(categories: readonly T[]): T[] {
  const rank = new Map<string, number>(homeCategoryOrder.map((slug, index) => [slug, index]));
  return [...categories].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
}

export function whatsappChatUrl(message = "Hi SpicyCenter, I have a question about Indian spices."): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const testimonials: readonly {
  name: string;
  rating: number;
  text: string;
  timeAgo: string;
  image?: string;
}[] = [];

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
    a: "Shipping is quoted in GBP for UK deliveries (EUR where an EU country rate is configured) from a weight-based per-kg rule. Import duty and VAT are extra unless a rule is marked inclusive.",
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
  {
    q: "Do you deliver outside the UK and Europe?",
    a: "The storefront currently quotes delivery for the United Kingdom and listed European countries only. India is our sourcing story, not a checkout destination on this site.",
  },
  {
    q: "What is the difference between whole and ground spices?",
    a: "Whole spices keep aroma longer; grind or crush just before cooking when you can. Ground spices are convenient for everyday tadka and masala blends but fade faster if stored warm or in light.",
  },
  {
    q: "How should I store Indian spices in the UK?",
    a: "Airtight tins or jars, away from the hob and sunlight. Buy retail packs for home use and 10kg+ only if you will turn the stock. We do not print fake ‘best before 5 years’ claims.",
  },
] as const;
