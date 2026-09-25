"use client";

import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductImageRotator } from "@/components/ProductImageRotator";
import { EnquireNowLink } from "@/components/EnquireNowLink";
import { BRAND_NAME, BULK_PACK_SIZES, PRODUCT_ORIGIN, featuredBilingualName, productTypeLabel } from "@/lib/catalogue";

export function HomeProductCard({
  product,
  priority = false,
}: {
  product: Product;
  showFastSellingBadge?: boolean;
  priority?: boolean;
}) {
  const bilingual = featuredBilingualName(product.name, product.slug);

  return (
    <div className="card-spice overflow-hidden relative flex h-full flex-col">
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
      <div className="p-3 flex h-full flex-col">
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-serif text-[15px] text-primary line-clamp-2 min-h-[2.75rem] hover:text-nav">
            {product.name}
          </h3>
          {bilingual ? (
            <p className="text-xs text-muted mt-1" lang="ar" dir="rtl">
              {bilingual.arabic}
            </p>
          ) : null}
        </Link>
        <p className="mt-2 text-[11px] text-muted leading-snug">
          {BRAND_NAME} · {productTypeLabel(product.categorySlug)} · Origin: {PRODUCT_ORIGIN}
        </p>
        <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">Pack sizes: {BULK_PACK_SIZES.join(", ")}</p>
        <div className="mt-auto pt-3">
          <EnquireNowLink productName={product.name} className="btn-primary w-full justify-center text-sm" />
        </div>
      </div>
    </div>
  );
}
