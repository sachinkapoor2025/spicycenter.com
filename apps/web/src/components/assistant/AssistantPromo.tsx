"use client";

import { openShoppingAssistant } from "@/components/assistant/ShoppingAssistant";

export function AssistantPromo({
  variant,
  productName,
}: {
  variant: "home" | "category" | "product" | "cart";
  productName?: string;
}) {
  const copy =
    variant === "home"
      ? { title: "Not sure what to choose?", body: "Ask our spice assistant.", prompt: undefined }
      : variant === "category"
        ? { title: "Looking for the right spice style?", body: "Ask our assistant.", prompt: "Help me narrow this collection" }
        : variant === "product"
          ? {
              title: "Not sure if this is right for you?",
              body: "Ask our spice assistant.",
              prompt: productName ? `Looking at ${productName}` : "Help me with this product",
            }
          : { title: "Need a matching item?", body: "Ask our assistant.", prompt: "Suggest something that matches my cart" };

  return (
    <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-violet-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-slate-700 min-w-0">
        <span className="mr-1" aria-hidden>
          🎃
        </span>
        <span className="font-semibold">{copy.title}</span> {copy.body}
      </p>
      <button
        type="button"
        onClick={() => openShoppingAssistant(copy.prompt)}
        className="shrink-0 self-start sm:self-auto rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 whitespace-nowrap"
      >
        Help me find something
      </button>
    </div>
  );
}
