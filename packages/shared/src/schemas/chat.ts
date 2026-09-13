import { z } from "zod";

export const CHAT_INTENTS = [
  "product_search",
  "category_search",
  "product_comparison",
  "product_information",
  "price_query",
  "shipping_query",
  "order_query",
  "return_query",
  "payment_query",
  "size_query",
  "styling_help",
  "spice_ideas",
  "location_query",
  "general_spice",
  "support",
  "navigation",
  "surprise",
  "party_planner",
  "start_over",
  "smalltalk",
] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];

export const shoppingStateSchema = z.object({
  category: z.string().max(80).optional(),
  categorySlug: z.string().max(80).optional(),
  subcategory: z.string().max(80).optional(),
  audience: z.string().max(40).optional(),
  gender: z.string().max(40).optional(),
  ageGroup: z.string().max(40).optional(),
  theme: z.string().max(80).optional(),
  style: z.string().max(80).optional(),
  occasion: z.string().max(80).optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  color: z.string().max(40).optional(),
  size: z.string().max(40).optional(),
  country: z.string().max(8).optional(),
  region: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  shippingRequirement: z.string().max(80).optional(),
  query: z.string().max(200).optional(),
  preferences: z.array(z.string().max(80)).max(12).optional(),
  shownSlugs: z.array(z.string().max(160)).max(24).optional(),
  selectedSlug: z.string().max(160).optional(),
  partySize: z.number().int().positive().max(500).optional(),
  indoorOutdoor: z.enum(["indoor", "outdoor", "both"]).optional(),
});

export type ShoppingState = z.infer<typeof shoppingStateSchema>;

export const chatQuickActionSchema = z.object({
  id: z.string().max(80),
  label: z.string().max(80),
  message: z.string().max(200),
  href: z.string().max(500).optional(),
});

export type ChatQuickAction = z.infer<typeof chatQuickActionSchema>;

export const assistantProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  image: z.string().optional(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  currency: z.string().default("USD"),
  categorySlug: z.string().optional(),
  url: z.string(),
  inventory: z.number().int().optional(),
  available: z.boolean().optional(),
  badge: z.string().max(40).optional(),
  variants: z
    .array(
      z.object({
        vid: z.string(),
        name: z.string().optional(),
        inventory: z.number().int().optional(),
      })
    )
    .optional(),
});

export type AssistantProduct = z.infer<typeof assistantProductSchema>;

export const chatBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(2000) }),
  z.object({ type: z.literal("quick_actions"), actions: z.array(chatQuickActionSchema).max(12) }),
  z.object({ type: z.literal("product_carousel"), heading: z.string().max(120).optional(), products: z.array(assistantProductSchema).max(8), viewAllHref: z.string().max(500).optional(), viewAllLabel: z.string().max(80).optional() }),
  z.object({ type: z.literal("product_card"), product: assistantProductSchema }),
  z.object({ type: z.literal("category_card"), title: z.string().max(80), href: z.string().max(500), subtitle: z.string().max(160).optional() }),
  z.object({ type: z.literal("link"), label: z.string().max(80), href: z.string().max(500) }),
  z.object({ type: z.literal("comparison"), products: z.array(assistantProductSchema).max(4), summary: z.string().max(800) }),
  z.object({ type: z.literal("error"), text: z.string().max(400), href: z.string().max(500).optional(), hrefLabel: z.string().max(80).optional() }),
]);

export type ChatBlock = z.infer<typeof chatBlockSchema>;

export const chatPageContextSchema = z.object({
  path: z.string().max(500),
  productSlug: z.string().max(160).optional(),
  productName: z.string().max(200).optional(),
  categorySlug: z.string().max(80).optional(),
  searchQuery: z.string().max(200).optional(),
});

export const chatCartItemSchema = z.object({
  slug: z.string().max(160),
  name: z.string().max(200).optional(),
});

export const chatMarketContextSchema = z.object({
  countryCode: z.string().max(8).optional(),
  postalCode: z.string().max(20).optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).max(16).default([]),
  page: z.string().max(500).optional(),
  sessionId: z.string().max(64).optional(),
  shoppingState: shoppingStateSchema.optional(),
  pageContext: chatPageContextSchema.optional(),
  cart: z.array(chatCartItemSchema).max(20).optional(),
  market: chatMarketContextSchema.optional(),
});

export const chatResponseSchema = z.object({
  message: z.string().optional(),
  blocks: z.array(chatBlockSchema).max(12),
  shoppingState: shoppingStateSchema.default({}),
  intent: z.enum(CHAT_INTENTS),
  unfulfilled: z.boolean().optional(),
  searchQuery: z.string().max(200).optional(),
  resultCount: z.number().int().nonnegative().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatPageContext = z.infer<typeof chatPageContextSchema>;
export type ChatMarketContext = z.infer<typeof chatMarketContextSchema>;

export const chatConfigSchema = z.object({
  enabled: z.boolean().default(true),
  launcherEnabled: z.boolean().default(true),
  invitationEnabled: z.boolean().default(true),
  invitationDelayMs: z.number().int().min(3000).max(120000).default(14000),
  welcomeMessage: z.string().max(400).default(
    "Hi! 🎃 I'm your SpicyCorner shopping assistant. With thousands of spice products, I can help you find exactly what you want."
  ),
  productResultCount: z.number().int().min(3).max(8).default(5),
  upsellLimit: z.number().int().min(0).max(4).default(2),
  countryPersonalization: z.boolean().default(true),
});

export type ChatConfig = z.infer<typeof chatConfigSchema>;

export const DEFAULT_CHAT_CONFIG: ChatConfig = chatConfigSchema.parse({});
