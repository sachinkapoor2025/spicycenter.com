"use client";

import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { isFastSelling } from "@spicycorner/shared";
import { WishlistButton } from "@/components/WishlistButton";
import { FastSellingBadge } from "@/components/FastSellingBadge";
import { ProductImageRotator } from "@/components/ProductImageRotator";
import { EnquireNowButton } from "@/components/EnquireNowButton";

export function HomeProductCard({
  product,
  showFastSellingBadge = false,
  priority = false,
}: {
  product: Product;
  showFastSellingBadge?: boolean;
  priority?: boolean;
}) {
  const fastSelling = showFastSellingBadge || isFastSelling(product);

  return (
    <div className="card-spice overflow-hidden relative flex h-full flex-col">
      {fastSelling && (
        <div className="absolute top-3 left-3 z-10">
          <FastSellingBadge />
        </div>
      )}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-beige p-2">
        <WishlistButton product={product} />
        <Link href={`/products/${product.slug}`} className="absolute inset-2 block overflow-hidden rounded-md">
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
          <h3 className="font-serif text-[15px] text-primary line-clamp-2 min-h-[2.75rem] hover:text-nav">
            {product.name}
          </h3>
        </div>
      </Link>
      <div className="mt-auto px-3 pb-3">
        <EnquireNowButton productName={product.name} variant="card" />
      </div>
    </div>
  );
}
