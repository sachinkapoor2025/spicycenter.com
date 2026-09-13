import type {
  AssistantProduct,
  ChatBlock,
  ChatIntent,
  ChatQuickAction,
  ShoppingState,
} from "../schemas/chat";
import type { Product } from "../schemas/product";
import { inferProductAudience, inferProductTheme } from "./homepage-ranking";
import { isProductAvailableForCountry } from "./shipping-availability";

export const CATEGORY_SLUGS = {
  whole: "whole-spices",
  ground: "ground-spices",
  chilli: "indian-chillies",
  masala: "indian-masalas",
  bulk: "bulk-spices",
  seeds: "seeds",
  herbs: "dried-herbs",
} as const;

const CATEGORY_KEYWORDS: Array<{ slug: string; label: string; pattern: RegExp }> = [
  { slug: CATEGORY_SLUGS.whole, label: "whole spices", pattern: /\b(whole|seed|pod|jeera|cumin seed)\b/i },
  { slug: CATEGORY_SLUGS.ground, label: "ground spices", pattern: /\b(powder|ground|haldi|turmeric powder)\b/i },
  { slug: CATEGORY_SLUGS.chilli, label: "chillies", pattern: /\b(chilli|chili|mirch|kashmiri|byadgi|guntur)\b/i },
  { slug: CATEGORY_SLUGS.masala, label: "masalas", pattern: /\b(masala|garam|sambar|rasam|curry powder)\b/i },
  { slug: CATEGORY_SLUGS.bulk, label: "bulk", pattern: /\b(bulk|wholesale|10kg|25kg|50kg)\b/i },
  { slug: CATEGORY_SLUGS.seeds, label: "seeds", pattern: /\b(ajwain|mustard|sesame|nigella|kalonji|fennel|saunf)\b/i },
];

const THEME_PATTERNS: Array<{ value: string; pattern: RegExp }> = [
  { value: "cumin", pattern: /\bcumin|jeera\b/i },
  { value: "turmeric", pattern: /\bturmeric|haldi\b/i },
  { value: "chilli", pattern: /\bchilli|chili|mirch\b/i },
  { value: "pepper", pattern: /\bpepper|kali mirch\b/i },
  { value: "cardamom", pattern: /\bcardamom|elaichi\b/i },
  { value: "cinnamon", pattern: /\bcinnamon|dalchini\b/i },
  { value: "coriander", pattern: /\bcoriander|dhania\b/i },
  { value: "masala", pattern: /\bmasala|garam masala|sambar\b/i },
];

const AUDIENCE_PATTERNS: Array<{ value: string; pattern: RegExp }> = [
  { value: "home-cook", pattern: /\b(home cook|household|family kitchen|home kitchen)\b/i },
  { value: "restaurant", pattern: /\b(restaurant|chef|kitchen|caterer|hotel)\b/i },
  { value: "wholesale", pattern: /\b(wholesale|wholesaler|distributor|grocer|importer)\b/i },
  { value: "retail", pattern: /\b(retail|100g|250g|500g|1kg)\b/i },
];

const STYLE_PATTERNS: Array<{ value: string; pattern: RegExp }> = [
  { value: "whole", pattern: /\b(whole|seed|pod|quill)\b/i },
  { value: "ground", pattern: /\b(ground|powder|milled)\b/i },
  { value: "hot", pattern: /\b(hot|extra hot|spicy|heat)\b/i },
  { value: "mild", pattern: /\b(mild|kashmiri colour|low heat)\b/i },
  { value: "organic", pattern: /\b(organic|certified organic)\b/i },
];

const OCCASION_PATTERNS: Array<{ value: string; pattern: RegExp }> = [
  { value: "curry", pattern: /\b(curry|sabzi|dal|biryani)\b/i },
  { value: "bulk-order", pattern: /\b(bulk|10kg|25kg|50kg|wholesale)\b/i },
  { value: "gift", pattern: /\b(gift|hamper|diwali box)\b/i },
];

const CITY_COUNTRY: Array<{ pattern: RegExp; city: string; country: string; region?: string }> = [
  { pattern: /\blondon\b/i, city: "London", country: "GB", region: "England" },
  { pattern: /\bmanchester\b/i, city: "Manchester", country: "GB" },
  { pattern: /\bsouthampton\b/i, city: "Southampton", country: "GB" },
  { pattern: /\bcalgary\b/i, city: "Calgary", country: "CA", region: "Alberta" },
  { pattern: /\btoronto\b/i, city: "Toronto", country: "CA", region: "Ontario" },
  { pattern: /\bvancouver\b/i, city: "Vancouver", country: "CA" },
  { pattern: /\bsydney\b/i, city: "Sydney", country: "AU" },
  { pattern: /\bmelbourne\b/i, city: "Melbourne", country: "AU" },
  { pattern: /\bdubai\b/i, city: "Dubai", country: "AE" },
  { pattern: /\bberlin\b/i, city: "Berlin", country: "DE" },
  { pattern: /\bnew york|nyc\b/i, city: "New York", country: "US" },
  { pattern: /\blos angeles|la\b/i, city: "Los Angeles", country: "US" },
  { pattern: /\bdelhi|mumbai|bangalore|india\b/i, city: "", country: "IN" },
];

function firstMatch<T extends { value: string; pattern: RegExp }>(text: string, list: T[]): string | undefined {
  return list.find((item) => item.pattern.test(text))?.value;
}

function parseBudget(text: string): { budgetMin?: number; budgetMax?: number } {
  const under = text.match(/\b(?:under|below|less than|max(?:imum)?)\s*\$?\s*(\d{1,4})\b/i);
  if (under) return { budgetMax: Number(under[1]) };
  const around = text.match(/\b(?:around|about)\s*\$?\s*(\d{1,4})\b/i);
  if (around) {
    const n = Number(around[1]);
    return { budgetMin: Math.max(0, n - 10), budgetMax: n + 10 };
  }
  const range = text.match(/\$?\s*(\d{1,4})\s*[-–to]+\s*\$?\s*(\d{1,4})/i);
  if (range) return { budgetMin: Number(range[1]), budgetMax: Number(range[2]) };
  return {};
}

function parsePartySize(text: string): number | undefined {
  const m = text.match(/\b(?:for|of)\s+(\d{1,3})\s+(?:people|guests|kids|children|persons)\b/i)
    ?? text.match(/\b(\d{1,3})\s+(?:people|guests)\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 2 && n <= 500 ? n : undefined;
}

export function classifyChatIntent(text: string): ChatIntent {
  const q = text.toLowerCase();
  if (/start over|new search|start again|reset/.test(q)) return "start_over";
  if (/surprise me|dealer.?s choice|show me anything/.test(q)) return "surprise";
  if (/compar|which (one|is better)|vs\b/.test(q)) return "product_comparison";
  if (/where is my order|track|order status|cancel (my )?order/.test(q)) return "order_query";
  if (/return policy|refund|exchange/.test(q)) return "return_query";
  if (/razorpay|stripe|pay|upi|card/.test(q) && !/cumin|chilli|masala/.test(q)) return "payment_query";
  if (/ship|deliver|arrive|reach|transit|london|calgary|uk\b|canada|australia/.test(q) && /can|will|does|to\b|in\b/.test(q)) {
    return "shipping_query";
  }
  if (/market price|spices board|indicative price/.test(q)) return "general_spice";
  if (/wholesale|10kg|25kg|bulk order/.test(q)) return "party_planner";
  if (/pack size|100g|500g|1kg|5kg/.test(q)) return "size_query";
  if (/help|support|whatsapp|contact|human/.test(q) && !/find|buy|cumin|chilli/.test(q)) return "support";
  if (/buy|need|want|show me|looking for|find/.test(q)) return "product_search";
  if (/category|browse|all spices/.test(q)) return "category_search";
  if (/recipe|how (do i|to) (use|cook|temper)/.test(q)) return "spice_ideas";
  if (/hello|hi\b|hey|thanks/.test(q) && q.length < 24) return "smalltalk";
  return "product_search";
}

export function mergeShoppingState(prev: ShoppingState, text: string): ShoppingState {
  const next: ShoppingState = { ...prev };
  const cat = CATEGORY_KEYWORDS.find((c) => c.pattern.test(text));
  if (cat) {
    next.category = cat.label;
    next.categorySlug = cat.slug;
  }
  const theme = firstMatch(text, THEME_PATTERNS);
  if (theme) next.theme = theme;
  const audience = firstMatch(text, AUDIENCE_PATTERNS);
  if (audience) {
    next.audience = audience;
    if (audience === "women" || audience === "men") next.gender = audience;
    if (audience === "kids") next.ageGroup = "kids";
  }
  const style = firstMatch(text, STYLE_PATTERNS);
  if (style) next.style = style;
  const occasion = firstMatch(text, OCCASION_PATTERNS);
  if (occasion) next.occasion = occasion;
  const budget = parseBudget(text);
  if (budget.budgetMax != null) next.budgetMax = budget.budgetMax;
  if (budget.budgetMin != null) next.budgetMin = budget.budgetMin;
  if (/\b(cheaper|less expensive|lower budget|under budget)\b/i.test(text)) {
    if (next.budgetMax != null) next.budgetMax = Math.max(8, Math.round(next.budgetMax * 0.7));
    else next.budgetMax = 30;
  }
  if (/\b(more expensive|upgrade|premium)\b/i.test(text) && next.budgetMax != null) {
    next.budgetMin = next.budgetMax;
    delete next.budgetMax;
  }
  const partySize = parsePartySize(text);
  if (partySize) next.partySize = partySize;
  if (/\boutdoor|yard|porch\b/i.test(text)) next.indoorOutdoor = "outdoor";
  else if (/\bindoor|inside|table\b/i.test(text)) next.indoorOutdoor = "indoor";
  const loc = CITY_COUNTRY.find((c) => c.pattern.test(text));
  if (loc) {
    next.country = loc.country;
    if (loc.city) next.city = loc.city;
    if (loc.region) next.region = loc.region;
  }
  if (/\buk\b|united kingdom|britain/i.test(text)) next.country = "GB";
  if (/\busa\b|united states|\bus\b/i.test(text)) next.country = "US";
  if (/\bcanada\b/i.test(text)) next.country = "CA";
  if (/\baustralia\b/i.test(text)) next.country = "AU";

  const cleaned = text
    .replace(/[?!.,]/g, " ")
    .replace(/\b(i|want|need|to|buy|a|an|the|for|my|me|please|looking|show|find|something)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 3 && cleaned.length <= 80) next.query = cleaned;
  return next;
}

export function buildSearchQuery(state: ShoppingState): string {
  const parts = [state.theme, state.style, state.audience, state.indoorOutdoor, state.category, state.query]
    .filter(Boolean)
    .map((s) => String(s));
  const unique = [...new Set(parts.map((p) => p.toLowerCase()))];
  return unique.join(" ").trim() || "spice";
}

export function viewAllHref(state: ShoppingState): string {
  if (state.categorySlug && !state.theme && !state.query) return `/categories/${state.categorySlug}`;
  const q = buildSearchQuery(state);
  const params = new URLSearchParams();
  if (q && q !== "spice") params.set("search", q);
  if (state.categorySlug) params.set("category", state.categorySlug);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export function missingShoppingSlots(state: ShoppingState, intent: ChatIntent): string[] {
  if (intent === "surprise" || intent === "general_spice" || intent === "support") return [];
  if (intent === "shipping_query" || intent === "order_query" || intent === "return_query") return [];
  if (intent === "party_planner" && !state.partySize) return ["partySize"];
  const missing: string[] = [];
  if (!state.categorySlug && !state.theme && !state.query) missing.push("category");
  return missing;
}

export function slotQuickActions(slot: string): ChatQuickAction[] {
  if (slot === "category") {
    return [
      { id: "cat-whole", label: "Whole spices", message: "I'm looking for whole spices" },
      { id: "cat-ground", label: "Powders", message: "I need spice powders" },
      { id: "cat-chilli", label: "Chillies", message: "I need Indian chillies" },
      { id: "cat-masala", label: "Masalas", message: "I need masala blends" },
      { id: "cat-bulk", label: "Bulk 10kg+", message: "I want to buy spices in bulk" },
    ];
    ];
  }
  if (slot === "audience") {
    return [
      { id: "aud-women", label: "Women", message: "For women" },
      { id: "aud-men", label: "Men", message: "For men" },
      { id: "aud-kids", label: "Kids", message: "For kids" },
      { id: "aud-couples", label: "Couples", message: "For couples" },
      { id: "aud-unsure", label: "Not sure", message: "Not sure, surprise me" },
    ];
  }
  if (slot === "style") {
    return [
      { id: "st-scary", label: "Scary", message: "Scary" },
      { id: "st-gothic", label: "Gothic", message: "Gothic" },
      { id: "st-classic", label: "Classic", message: "Classic" },
      { id: "st-funny", label: "Funny", message: "Funny" },
      { id: "st-surprise", label: "Surprise me", message: "Surprise me" },
    ];
  }
  if (slot === "partySize") {
    return [
      { id: "ps-8", label: "Under 10", message: "About 8 guests" },
      { id: "ps-20", label: "10–25", message: "About 20 guests" },
      { id: "ps-40", label: "25+", message: "About 40 guests" },
    ];
  }
  return [];
}

export function scoreProductForState(product: Product, state: ShoppingState, country?: string): number {
  const hay = `${product.name} ${product.tags?.join(" ") ?? ""} ${product.description ?? ""}`.toLowerCase();
  const inferredTheme = inferProductTheme(product.name, product.tags);
  if (state.theme) {
    const theme = state.theme.toLowerCase();
    if (!hay.includes(theme) && inferredTheme !== state.theme) return 0;
  }
  let score = 1;
  if (state.theme && hay.includes(state.theme.toLowerCase())) score += 8;
  if (state.style && hay.includes(state.style.toLowerCase())) score += 4;
  if (state.audience) {
    const aud = inferProductAudience(product.name, product.tags);
    if (aud === state.audience || (state.audience === "kids" && aud === "kids")) score += 5;
    else if (aud !== "all") score -= 2;
  }
  if (state.categorySlug && product.categorySlug === state.categorySlug) score += 3;
  if (state.indoorOutdoor === "outdoor" && /bulk|wholesale|25kg|50kg/.test(hay)) score += 4;
  if (state.query) {
    for (const word of state.query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)) {
      if (hay.includes(word)) score += 2;
    }
  }
  if (state.budgetMax != null && product.price <= state.budgetMax) score += 3;
  if (state.budgetMax != null && product.price > state.budgetMax) score -= 6;
  if (country) {
    const avail = isProductAvailableForCountry(product, country);
    if (avail === "unavailable") score -= 20;
    if (avail === "available") score += 1;
  }
  if ((product.inventory ?? 0) <= 0) score -= 30;
  if ((product.unitsSold ?? 0) > 20) score += 1;
  if (state.theme && inferredTheme === state.theme) score += 2;
  return score;
}

export function toAssistantProduct(product: Product): AssistantProduct {
  const sold = product.unitsSold ?? 0;
  let badge: string | undefined;
  if (sold >= 80) badge = "Best Seller";
  else if (sold >= 25) badge = "Popular";
  const available = (product.inventory ?? 0) > 0 && product.published !== false;
  return {
    slug: product.slug,
    name: product.name,
    image: product.images?.[0],
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency ?? "USD",
    categorySlug: product.categorySlug,
    url: `/products/${product.slug}`,
    inventory: product.inventory,
    available,
    badge,
    variants: product.cjVariants
      ?.filter((v) => (v.inventory ?? 1) > 0)
      .slice(0, 8)
      .map((v) => ({ vid: v.vid, name: v.name || v.key, inventory: v.inventory })),
  };
}

export function welcomeQuickActions(): ChatQuickAction[] {
  return [
    { id: "q-whole", label: "Whole spices", message: "I want whole Indian spices" },
    { id: "q-chilli", label: "Chillies", message: "I need Indian chillies" },
    { id: "q-masala", label: "Masalas", message: "Show me garam masala and blends" },
    { id: "q-bulk", label: "Wholesale 10kg+", message: "I need spices in bulk from 10kg" },
    { id: "q-find", label: "Find a spice", message: "Help me find a spice" },
    { id: "q-ship", label: "Shipping", message: "How does UK shipping work?" },
  ];
}

export function invitationQuickActions(): ChatQuickAction[] {
  return [
    { id: "inv-shop", label: "Shop spices", message: "I want to buy Indian spices" },
    { id: "inv-bulk", label: "Wholesale", message: "I need 10kg bulk spices" },
    { id: "inv-ask", label: "Ask a question", message: "I have a question about spices" },
  ];
}

export function productPageQuickActions(name: string): ChatQuickAction[] {
  return [
    { id: "p-similar", label: "Find similar", message: `Find similar products to ${name}` },
    { id: "p-accessories", label: "Matching accessories", message: `Find matching accessories for ${name}` },
    { id: "p-cheaper", label: "Something cheaper", message: "Show me something cheaper" },
    { id: "p-ship", label: "Check shipping", message: "Can this ship to my location?" },
  ];
}

export function textBlock(text: string): ChatBlock {
  return { type: "text", text };
}

export function actionsBlock(actions: ChatQuickAction[]): ChatBlock {
  return { type: "quick_actions", actions };
}
