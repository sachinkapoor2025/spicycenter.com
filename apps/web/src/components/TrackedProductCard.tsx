"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@spicycorner/shared";
import { HomeProductCard } from "@/components/HomeProductCard";
import { trackProductClick, trackProductImpression } from "@/lib/track";

const seen = new Set<string>();

export function TrackedProductCard({
  product,
  position,
  listingPage,
  showFastSellingBadge = false,
  priority = false,
}: {
  product: Product;
  position: number;
  listingPage: string;
  showFastSellingBadge?: boolean;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const key = `${listingPage}:${product.slug}`;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (seen.has(key)) return;
        seen.add(key);
        trackProductImpression(product.slug, {
          position,
          listingPage,
          category: product.categorySlug,
        });
        observer.disconnect();
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [listingPage, position, product.categorySlug, product.slug]);

  return (
    <div
      ref={ref}
      onClickCapture={() =>
        trackProductClick(product.slug, {
          position,
          listingPage,
          category: product.categorySlug,
        })
      }
    >
      <HomeProductCard product={product} showFastSellingBadge={showFastSellingBadge} priority={priority} />
    </div>
  );
}
