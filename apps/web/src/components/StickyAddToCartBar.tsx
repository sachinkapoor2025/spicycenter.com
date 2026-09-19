"use client";

import { useEffect, useState } from "react";
import type { Product } from "@spicycorner/shared";
import { EnquireNowButton } from "@/components/EnquireNowButton";

/** Fixed bottom bar on mobile so Enquire Now stays visible while scrolling. */
export function StickyAddToCartBar({
  product,
}: {
  product: Product;
  getContact?: () => { name?: string; email?: string; phone?: string };
  addons?: unknown;
  cjVid?: string;
  hamperCustomization?: unknown;
  extraUsd?: number;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 truncate">{product.name}</p>
          <p className="text-sm font-semibold text-primary">Request availability</p>
        </div>
        <div className="w-[9.5rem] shrink-0">
          <EnquireNowButton productName={product.name} variant="sticky" />
        </div>
      </div>
    </div>
  );
}
