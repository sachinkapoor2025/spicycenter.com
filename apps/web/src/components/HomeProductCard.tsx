"use client";

import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { isFastSelling } from "@spicycorner/shared";
import { AddToCartControl } from "@/components/AddToCartControl";
import { WishlistButton } from "@/components/WishlistButton";
import { FastSellingBadge } from "@/components/FastSellingBadge";
import { useCurrency } from "@/lib/currency-context";
import { getDiscountPercent } from "@/lib/pricing";
import { ProductImageRotator } from "@/components/ProductImageRotator";

export function HomeProductCard({
  product,
  showFastSellingBadge = false,
  priority = false,
}: {
  product: Product;
  showFastSellingBadge?: boolean;
  priority?: boolean;
}) {
  const { format } = useCurrency();
  const discount = getDiscountPercent(product.price, product.compareAtPrice);
  const fastSelling = showFastSellingBadge || isFastSelling(product);

  return (
    <div className="card-spice overflow-hidden relative flex h-full flex-col">
      {discount !== null && (
        <span className="absolute top-3 left-3 z-10 bg-nav text-white text-xs font-bold px-2 py-1 rounded">
          {discount}% OFF
        </span>
      )}
      {fastSelling && (
        <div className={`absolute top-3 z-10 ${discount !== null ? "right-3" : "left-3"}`}>
          <FastSellingBadge />
        </div>
      )}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-slate-50">
        <WishlistButton product={product} />
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
          <ProductImageRotator
            images={product.images ?? []}
            alt={product.name}
            staggerKey={product.slug}
            className="absolute inset-0 h-full w-full"
            priority={priority}
          />
        </Link>
      </div>
      <Link href={`/products/${product.slug}`} className="block flex-1">
        <div className="p-3 flex h-full flex-col">
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 min-h-[2.75rem] hover:text-nav">
            {product.name}
          </h3>
          <div className="mt-2 flex items-center gap-2 w-full">
            <span className="text-nav font-bold">{format(product.price, product.currency)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">
                {format(product.compareAtPrice, product.currency)}
              </span>
            )}
            {discount !== null && (
              <span className="text-xs font-semibold text-green-600 ml-auto shrink-0">{discount}% OFF</span>
            )}
          </div>
        </div>
      </Link>
      <div className="mt-auto px-3 pb-3">
        <AddToCartControl productSlug={product.slug} disabled={product.inventory <= 0} />
      </div>
    </div>
  );
}
