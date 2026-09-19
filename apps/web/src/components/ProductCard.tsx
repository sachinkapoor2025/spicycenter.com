"use client";

import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductImageRotator } from "@/components/ProductImageRotator";
import { EnquireNowButton } from "@/components/EnquireNowButton";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white relative flex flex-col">
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
      <Link href={`/products/${product.slug}`} className="block p-4 pb-2 flex-1">
        <h3 className="font-semibold text-slate-900 group-hover:text-primary line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
      </Link>
      <div className="px-4 pb-4">
        <EnquireNowButton productName={product.name} variant="card" />
      </div>
    </div>
  );
}
