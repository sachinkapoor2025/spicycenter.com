import { NextResponse } from "next/server";
import {
  chatRequestSchema,
  chatResponseSchema,
  DEFAULT_CHAT_CONFIG,
} from "@spicycorner/shared";
import { runShoppingAssistant } from "@/lib/chat/orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { messages, shoppingState, pageContext, cart, market } = parsed.data;
    const recent = (messages ?? []).slice(-12);

    const result = await runShoppingAssistant({
      messages: recent,
      shoppingState,
      pageContext,
      cart,
      country: market?.countryCode,
      productLimit: DEFAULT_CHAT_CONFIG.productResultCount,
    });

    const payload = chatResponseSchema.parse({
      ...result,
      shoppingState: result.shoppingState ?? {},
      message: result.blocks
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n"),
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Chat assistant error", err);
    return NextResponse.json(
      {
        blocks: [
          {
            type: "error",
            text: "I'm having trouble searching the products right now. You can browse our spice collection here.",
            href: "/products",
            hrefLabel: "Browse spice",
          },
        ],
        shoppingState: {},
        intent: "support",
        message: "I'm having trouble searching the products right now.",
      },
      { status: 200 }
    );
  }
}

export const runtime = "nodejs";
