"use client";

import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductImageRotator } from "@/components/ProductImageRotator";
import { useCurrency } from "@/lib/currency-context";
import { getDiscountPercent } from "@/lib/pricing";

export function ProductCard({ product }: { product: Product }) {
  const { format } = useCurrency();
  const discount = getDiscountPercent(product.price, product.compareAtPrice);

  return (
    <div className="group border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white relative">
      {discount && (
        <span className="absolute top-3 left-3 z-10 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
          {discount}% OFF
        </span>
      )}
      <div className="relative aspect-square bg-slate-50 flex items-center justify-center text-slate-400">
        <WishlistButton product={product} />
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
          <ProductImageRotator
            images={product.images ?? []}
            alt={product.name}
            staggerKey={product.slug}
            className="absolute inset-0 h-full w-full"
          />
        </Link>
      </div>
      <Link href={`/products/${product.slug}`} className="block p-4">
        <h3 className="font-semibold text-slate-900 group-hover:text-primary line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 w-full">
          <p className="text-accent font-bold">{format(product.price, product.currency)}</p>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className="text-sm text-slate-400 line-through">
              {format(product.compareAtPrice, product.currency)}
            </p>
          )}
          {discount !== null && (
            <span className="text-xs font-semibold text-green-600 ml-auto shrink-0">{discount}% OFF</span>
          )}
        </div>
      </Link>
    </div>
  );
}
