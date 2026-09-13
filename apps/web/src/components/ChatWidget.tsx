"use client";

import { Suspense } from "react";
import { ShoppingAssistant } from "@/components/assistant/ShoppingAssistant";

/** Back-compat export — personal shopping assistant replaces the old text chat. */
export function ChatWidget() {
  return (
    <Suspense fallback={null}>
      <ShoppingAssistant />
    </Suspense>
  );
}
