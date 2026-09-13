"use client";

import { useEffect, useState } from "react";
import { AddToCartControl } from "@/components/AddToCartControl";
import { useCurrency } from "@/lib/currency-context";
import { getProductAddon, sumAddonPrices, type HamperCustomization, type Product, type ProductAddonSelection } from "@spicycorner/shared";

/** Fixed bottom bar on mobile so Add to Cart stays visible while scrolling. */
export function StickyAddToCartBar({
  product,
  getContact,
  addons = [],
  cjVid,
  hamperCustomization,
  extraUsd = 0,
  disabled = false,
}: {
  product: Product;
  getContact?: () => { name?: string; email?: string; phone?: string };
  addons?: ProductAddonSelection[];
  cjVid?: string;
  hamperCustomization?: HamperCustomization;
  extraUsd?: number;
  disabled?: boolean;
}) {
  const { format } = useCurrency();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible || product.inventory <= 0) return null;

  const addonsUsdTotal = sumAddonPrices(
    addons.map((s) => {
      const def = getProductAddon(s.id);
      return {
        id: s.id,
        name: def?.name ?? s.id,
        price: def?.priceUsd ?? 0,
        quantity: s.quantity,
      };
    })
  );
  const showCombined = addonsUsdTotal + extraUsd > 0 && product.currency === "USD";
  const displayPrice = showCombined ? product.price + addonsUsdTotal + extraUsd : product.price;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 truncate">{product.name}</p>
          <p className="font-bold text-primary">{format(displayPrice, product.currency)}</p>
        </div>
        <div className="w-[9.5rem] shrink-0">
          <AddToCartControl
            productSlug={product.slug}
            disabled={disabled}
            fullWidth
            variant="detail"
            getContact={getContact}
            addons={addons}
            cjVid={cjVid}
            hamperCustomization={hamperCustomization}
          />
        </div>
      </div>
    </div>
  );
}
