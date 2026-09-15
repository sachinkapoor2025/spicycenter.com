"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { spiceStockImagesForProduct } from "@/lib/spice-stock-images";
import { StorefrontPrice } from "@/components/StorefrontPrice";

export function SpiceSkuCard({ product }: { product: Product }) {
  const src = product.images?.[0] || spiceStockImagesForProduct(product)[0];
  return (
    <Link href={`/products/${product.slug}`} className="card-spice overflow-hidden group">
      <span className="relative block aspect-[4/3] bg-beige">
        <Image src={src} alt={product.name} fill className="object-cover group-hover:scale-[1.03] transition" sizes="(max-width: 640px) 100vw, (min-width: 1024px) 33vw, 50vw" />
      </span>
      <span className="block p-4">
        <span className="font-semibold text-primary group-hover:text-nav">{product.name}</span>
        <span className="block text-sm text-muted mt-1">
          <StorefrontPrice amount={product.price} from={product.currency} /> selling price
        </span>
      </span>
    </Link>
  );
}
