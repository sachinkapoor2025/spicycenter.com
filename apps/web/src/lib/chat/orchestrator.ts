import {
  actionsBlock,
  classifyChatIntent,
  DEFAULT_CHAT_CONFIG,
  mergeShoppingState,
  missingShoppingSlots,
  productPageQuickActions,
  slotQuickActions,
  textBlock,
  viewAllHref,
  welcomeQuickActions,
  type ChatBlock,
  type ChatIntent,
  type ChatPageContext,
  type ChatResponse,
  type ShoppingState,
} from "@spicycorner/shared";
import { searchAssistantProducts } from "./search-products";
import { searchSiteContent, whatsappChatUrl } from "./content-search";

function toResponse(
  found: Awaited<ReturnType<typeof productResults>>,
  intent: ChatIntent,
  blocks?: ChatBlock[]
): ChatResponse {
  return {
    blocks: blocks ?? found.blocks,
    shoppingState: found.state,
    intent,
    unfulfilled: found.unfulfilled,
    searchQuery: found.query,
    resultCount: found.count,
  };
}

function lastUserMessage(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i]!.content;
  }
  return "";
}

function followUpActions(state: ShoppingState): ChatBlock {
  const actions = [
    { id: "more", label: "Show more", message: "Show me more like these" },
    { id: "cheaper", label: "Cheaper options", message: "Show me something cheaper" },
    ...(state.categorySlug === "indian-chillies"
      ? [{ id: "acc", label: "Matching accessories", message: "Find matching accessories" }]
      : []),
    { id: "new", label: "Start new search", message: "Start over" },
  ];
  return actionsBlock(actions);
}

async function productResults(
  state: ShoppingState,
  country: string | undefined,
  limit: number
): Promise<{ blocks: ChatBlock[]; state: ShoppingState; unfulfilled: boolean; query: string; count: number }> {
  const result = await searchAssistantProducts(state, {
    country,
    limit,
    excludeSlugs: state.shownSlugs,
  });
  const shownSlugs = [...(state.shownSlugs ?? []), ...result.products.map((p) => p.slug)].slice(-24);
  const next = { ...state, shownSlugs, query: result.query };

  if (result.unfulfilled) {
    return {
      blocks: [
        textBlock("I don't have a close match for that right now. You can browse the spice collection, or try a broader search."),
        actionsBlock([
          { id: "browse", label: "Browse spice", message: "Show me popular spice products", href: "/products" },
          { id: "spices", label: "Spices", message: "Show spices" },
          { id: "decor", label: "Decorations", message: "Show decorations" },
          { id: "new", label: "Start new search", message: "Start over" },
        ]),
      ],
      state: next,
      unfulfilled: true,
      query: result.query,
      count: 0,
    };
  }

  const bits = [
    state.audience,
    state.style,
    state.theme,
    state.category,
    state.budgetMax != null ? `under $${state.budgetMax}` : null,
  ].filter(Boolean);
  const label = bits.length ? bits.join(" ") : "spice picks";

  return {
    blocks: [
      textBlock(`Here are ${result.products.length} ${label} I found.`),
      {
        type: "product_carousel",
        products: result.products,
        viewAllHref: viewAllHref(state),
        viewAllLabel: "View all results",
      },
      followUpActions(state),
    ],
    state: next,
    unfulfilled: false,
    query: result.query,
    count: result.products.length,
  };
}

export async function runShoppingAssistant(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  shoppingState?: ShoppingState;
  pageContext?: ChatPageContext;
  cart?: { slug: string; name?: string }[];
  country?: string;
  productLimit?: number;
}): Promise<ChatResponse> {
  const userText = lastUserMessage(input.messages);
  const prev = input.shoppingState ?? {};
  let intent: ChatIntent = classifyChatIntent(userText || "hello");
  let state = userText ? mergeShoppingState(prev, userText) : { ...prev };
  if (input.country && !state.country) state.country = input.country;

  const limit = input.productLimit ?? DEFAULT_CHAT_CONFIG.productResultCount;
  const country = state.country ?? input.country;

  if (!userText || intent === "smalltalk") {
    const ctx = input.pageContext;
    if (ctx?.productSlug && ctx.productName) {
      return {
        blocks: [
          textBlock(`Looking at this ${ctx.productName}? I can help you compare, find similar items, or check shipping.`),
          actionsBlock(productPageQuickActions(ctx.productName)),
        ],
        shoppingState: { ...state, selectedSlug: ctx.productSlug, query: ctx.productName },
        intent: "product_information",
      };
    }
    if (ctx?.categorySlug) {
      return {
        blocks: [
          textBlock("Looking for a particular type in this collection?"),
          actionsBlock(slotQuickActions("style").concat(slotQuickActions("audience")).slice(0, 8)),
        ],
        shoppingState: { ...state, categorySlug: ctx.categorySlug },
        intent: "category_search",
      };
    }
    if (ctx?.searchQuery) {
      state = mergeShoppingState(state, ctx.searchQuery);
      const found = await productResults(state, country, limit);
      return {
        ...toResponse(found, "product_search"),
        blocks: [textBlock(`Want me to narrow down “${ctx.searchQuery}”? Here are some options.`), ...found.blocks.slice(1)],
      };
    }
    const cartHint =
      input.cart?.length && input.cart[0]?.name
        ? ` You already have ${input.cart[0].name} in your cart — I can suggest a matching extra if you want.`
        : "";
    return {
      blocks: [
        textBlock(`Hi! 🎃 I'm your SpicyCenter shopping assistant. With thousands of spice products, I can help you find exactly what you're looking for.${cartHint}`),
        textBlock("What are you shopping for?"),
        actionsBlock(welcomeQuickActions()),
      ],
      shoppingState: state,
      intent: "smalltalk",
    };
  }

  if (intent === "start_over") {
    return {
      blocks: [
        textBlock("Fresh start. What are you shopping for?"),
        actionsBlock(welcomeQuickActions()),
      ],
      shoppingState: { country: state.country },
      intent: "start_over",
    };
  }

  if (intent === "support" || intent === "order_query") {
    return {
      blocks: [
        textBlock("For order tracking, changes, or refunds, WhatsApp is fastest. I can also point you to shipping and returns."),
        actionsBlock([
          { id: "wa", label: "Chat on WhatsApp", message: "Open WhatsApp", href: whatsappChatUrl() },
          { id: "ship", label: "Shipping", message: "How does shipping work?", href: "/shipping" },
          { id: "returns", label: "Returns", message: "What's your return policy?", href: "/returns" },
          { id: "account", label: "My orders", message: "Show my orders", href: "/account" },
        ]),
      ],
      shoppingState: state,
      intent,
    };
  }

  if (intent === "return_query") {
    return {
      blocks: [
        textBlock("You can read the returns policy here. For a specific order, WhatsApp the team with your order number."),
        { type: "link", label: "Returns & guarantee", href: "/returns" },
        actionsBlock([{ id: "wa", label: "Chat on WhatsApp", message: "Open WhatsApp", href: whatsappChatUrl() }]),
      ],
      shoppingState: state,
      intent,
    };
  }

  if (intent === "payment_query") {
    return {
      blocks: [
        textBlock("Checkout is Stripe in USD or Razorpay in INR. We never store card details."),
        actionsBlock([
          { id: "shop", label: "Keep shopping", message: "Show me popular spice products" },
          { id: "faq", label: "FAQ", message: "Open FAQ", href: "/faq" },
        ]),
      ],
      shoppingState: state,
      intent,
    };
  }

  if (intent === "general_spice" || intent === "spice_ideas") {
    const hits = searchSiteContent(userText);
    const when = /when is spice/i.test(userText)
      ? "spice is celebrated every year on your requested date. In 2026 that’s a Saturday. 🎃"
      : "Here are useful SpicyCenter guides.";
    return {
      blocks: [
        textBlock(when),
        ...(hits[0]
          ? [{ type: "link" as const, label: hits[0].title, href: hits[0].href }]
          : [{ type: "link" as const, label: "spice guide", href: "/spice-guide" }]),
        actionsBlock([
          { id: "c", label: "Find spices", message: "Find a spice" },
          { id: "d", label: "Find decorations", message: "Find decorations" },
        ]),
      ],
      shoppingState: state,
      intent,
    };
  }

  if (intent === "shipping_query") {
    const dest = state.city ? `${state.city}${state.country ? `, ${state.country}` : ""}` : state.country || "your destination";
    return {
      blocks: [
        textBlock(`I can check shipping on a specific product. Quotes are available for the US, UK, Canada, Australia, and Germany — I won't invent transit times for ${dest}.`),
        actionsBlock([
          { id: "ship-page", label: "Shipping info", message: "Open shipping page", href: "/shipping" },
          { id: "pick", label: "Find a product first", message: "Help me find a product" },
        ]),
      ],
      shoppingState: state,
      intent,
    };
  }

  if (intent === "product_comparison" && (state.shownSlugs?.length ?? 0) >= 2) {
    const found = await productResults(state, country, Math.min(3, limit));
    return {
      blocks: [
        textBlock("If you want something scarier, start with the first. If you want easier to wear or cheaper, compare price on the cards — I only use real catalog data."),
        ...found.blocks.filter((b) => b.type === "product_carousel"),
      ],
      shoppingState: found.state,
      intent,
      searchQuery: found.query,
      resultCount: found.count,
    };
  }

  if (intent === "party_planner") {
    const missing = missingShoppingSlots(state, intent);
    if (missing[0] === "partySize") {
      return {
        blocks: [textBlock("Nice! 🎃 How many guests?"), actionsBlock(slotQuickActions("partySize"))],
        shoppingState: { ...state, category: "spice packs", categorySlug: "indian-masalas", occasion: "spice-party" },
        intent,
      };
    }
    state = { ...state, category: "spice packs", categorySlug: "indian-masalas", occasion: "spice-party" };
    const found = await productResults(state, country, limit);
    const sizeNote = state.partySize ? ` For ${state.partySize} guests, start with tableware and a few statement decorations.` : "";
    return toResponse(found, intent, [
      textBlock(`Great — let's plan the party.${sizeNote}`),
      ...found.blocks.slice(1),
    ]);
  }

  if (intent === "surprise") {
    const found = await productResults({ ...state, query: state.query || "spice" }, country, limit);
    return toResponse(found, intent, [textBlock("Surprise mix coming up. 🎃"), ...found.blocks.slice(1)]);
  }

  const shoppingIntent =
    intent === "product_search" ||
    intent === "category_search" ||
    intent === "styling_help" ||
    intent === "size_query" ||
    intent === "price_query" ||
    intent === "product_information" ||
    intent === "navigation";

  if (shoppingIntent) {
    const hasEnough = Boolean(state.theme || state.query || state.categorySlug);
    const missing = hasEnough ? missingShoppingSlots(state, "product_search") : ["category"];
    const userGaveDetails = Boolean(state.theme && (state.audience || state.budgetMax || state.style));
    if (missing[0] && !userGaveDetails && !/show me|these|more like/i.test(userText)) {
      const slot = missing[0];
      const prompt =
        slot === "audience"
          ? "Absolutely! 🧙‍♀️ Who's it for?"
          : slot === "style"
            ? "Great. What style?"
            : "What can I help you find?";
      return {
        blocks: [textBlock(prompt), actionsBlock(slotQuickActions(slot))],
        shoppingState: state,
        intent: "product_search",
      };
    }

    try {
      const found = await productResults(state, country, limit);
      return toResponse(found, "product_search");
    } catch {
      return {
        blocks: [
          {
            type: "error",
            text: "I'm having trouble searching products right now. You can browse the spice collection here.",
            href: "/products",
            hrefLabel: "Browse spice",
          },
        ],
        shoppingState: state,
        intent: "product_search",
      };
    }
  }

  const hits = searchSiteContent(userText);
  return {
    blocks: [
      textBlock("I can help you shop spice products, or open a guide if that's more useful."),
      ...(hits[0] ? [{ type: "link" as const, label: hits[0].title, href: hits[0].href }] : []),
      actionsBlock(welcomeQuickActions().slice(0, 4)),
    ],
    shoppingState: state,
    intent,
  };
}
