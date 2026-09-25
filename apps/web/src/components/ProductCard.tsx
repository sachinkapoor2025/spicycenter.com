"use client";

import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductImageRotator } from "@/components/ProductImageRotator";
import { EnquireNowLink } from "@/components/EnquireNowLink";
import { BRAND_NAME, BULK_PACK_SIZES, PRODUCT_ORIGIN, featuredBilingualName, productTypeLabel } from "@/lib/catalogue";

export function ProductCard({ product }: { product: Product }) {
  const bilingual = featuredBilingualName(product.name, product.slug);

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
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-slate-900 group-hover:text-primary line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          {bilingual ? (
            <p className="text-sm text-muted mt-1" dir="rtl" lang="ar">
              {bilingual.english} — {bilingual.arabic}
            </p>
          ) : null}
        </Link>
        <p className="mt-2 text-xs text-muted">
          {BRAND_NAME} · {productTypeLabel(product.categorySlug)} · Origin: {PRODUCT_ORIGIN}
        </p>
        <p className="mt-2 text-xs text-slate-600">Pack sizes: {BULK_PACK_SIZES.join(", ")}</p>
        <div className="mt-3">
          <EnquireNowLink productName={product.name} className="btn-primary w-full justify-center text-sm" />
        </div>
      </div>
    </div>
  );
}
