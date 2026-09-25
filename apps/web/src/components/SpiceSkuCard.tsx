"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { spiceStockImagesForProduct } from "@/lib/spice-stock-images";
import { EnquireNowLink } from "@/components/EnquireNowLink";
import { BRAND_NAME, BULK_PACK_SIZES, PRODUCT_ORIGIN, featuredBilingualName, productTypeLabel } from "@/lib/catalogue";

export function SpiceSkuCard({ product }: { product: Product }) {
  const src = product.images?.[0] || spiceStockImagesForProduct(product)[0];
  const bilingual = featuredBilingualName(product.name, product.slug);

  return (
    <article className="card-spice overflow-hidden group flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] bg-beige">
        <Image
          src={src}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-[1.03] transition"
          sizes="(max-width: 640px) 100vw, (min-width: 1024px) 33vw, 50vw"
        />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.slug}`} className="font-semibold text-primary group-hover:text-nav">
          {product.name}
        </Link>
        {bilingual ? (
          <p className="text-sm text-muted mt-1" lang="ar" dir="rtl">
            {bilingual.english} — {bilingual.arabic}
          </p>
        ) : null}
        <p className="text-xs text-muted mt-2">
          {BRAND_NAME} · {productTypeLabel(product.categorySlug)} · Origin: {PRODUCT_ORIGIN}
        </p>
        <p className="text-xs text-slate-600 mt-2">Available pack sizes: {BULK_PACK_SIZES.join(", ")}</p>
        <div className="mt-3">
          <EnquireNowLink productName={product.name} className="btn-primary w-full justify-center text-sm" />
        </div>
      </div>
    </article>
  );
}
