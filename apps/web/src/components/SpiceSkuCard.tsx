"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { spiceStockImagesForProduct } from "@/lib/spice-stock-images";
import { EnquireNowButton } from "@/components/EnquireNowButton";

export function SpiceSkuCard({ product }: { product: Product }) {
  const src = product.images?.[0] || spiceStockImagesForProduct(product)[0];
  return (
    <div className="card-spice overflow-hidden group flex flex-col h-full">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] bg-beige">
        <Image src={src} alt={product.name} fill className="object-cover group-hover:scale-[1.03] transition" sizes="(max-width: 640px) 100vw, (min-width: 1024px) 33vw, 50vw" />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.slug}`} className="font-semibold text-primary group-hover:text-nav">
          {product.name}
        </Link>
        <div className="mt-3">
          <EnquireNowButton productName={product.name} variant="card" />
        </div>
      </div>
    </div>
  );
}
