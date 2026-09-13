"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { TrackedProductCard } from "@/components/TrackedProductCard";
import { ProductSortBar, type ProductSort } from "@/components/ProductSortBar";
import {
  STOREFRONT_LISTING_CHUNK_SIZE,
  cjStorefrontProductsPath,
  type Product,
} from "@spicycorner/shared";
import { api } from "@/lib/api";

type ListingFeed = {
  products: Product[];
  total: number;
  offset: number;
  hasMore: boolean;
};

function mergeProducts(current: Product[], incoming: Product[]): Product[] {
  const bySlug = new Map(current.map((p) => [p.slug, p]));
  for (const product of incoming) {
    if (!bySlug.has(product.slug)) bySlug.set(product.slug, product);
  }
  return [...bySlug.values()];
}

/**
 * Product cards render in the initial HTML (no "Loading products…" Suspense).
 * Only the sort control uses useSearchParams and stays behind a tiny Suspense boundary.
 * Extra rows load in chunks as the shopper scrolls.
 */
export function ProductGrid({
  products,
  total,
  hasMore: initialHasMore = false,
  showSort = true,
  listingPage = "listing",
  category,
  search,
  sort = "featured",
}: {
  products: Product[];
  total?: number;
  hasMore?: boolean;
  showSort?: boolean;
  listingPage?: string;
  category?: string;
  search?: string;
  sort?: ProductSort;
}) {
  const [loaded, setLoaded] = useState(products);
  const [offset, setOffset] = useState(products.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const catalogTotal = total ?? loaded.length;

  useEffect(() => {
    setLoaded(products);
    setOffset(products.length);
    setHasMore(initialHasMore);
  }, [products, initialHasMore, category, search, sort]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await api<ListingFeed>(
        cjStorefrontProductsPath({
          ...(category ? { category } : {}),
          ...(search ? { search } : {}),
          ...(sort !== "featured" ? { sort } : {}),
          offset,
          limit: STOREFRONT_LISTING_CHUNK_SIZE,
        })
      );
      const next = data.products ?? [];
      setLoaded((current) => mergeProducts(current, next));
      setOffset(data.offset + next.length);
      setHasMore(Boolean(data.hasMore) && next.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [category, hasMore, offset, search, sort]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "480px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      {showSort && catalogTotal > 1 && (
        <div className="flex justify-end mb-4">
          <Suspense fallback={<div className="h-9 w-40" aria-hidden />}>
            <ProductSortBar />
          </Suspense>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
        {loaded.map((p, i) => (
          <TrackedProductCard
            key={p.slug}
            product={p}
            position={i + 1}
            listingPage={listingPage}
            priority={i < 4}
          />
        ))}
      </div>
      {(hasMore || loaded.length < catalogTotal) && (
        <>
          <div ref={sentinelRef} className="h-10" aria-hidden />
          <p className="text-center text-xs text-slate-500 mt-3">
            Showing {loaded.length} of {catalogTotal} products
          </p>
          {hasMore && (
            <div className="text-center mt-3">
              <button
                type="button"
                className="rounded-lg bg-nav px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => void loadMore()}
                disabled={loading}
              >
                {loading
                  ? "Loading…"
                  : `Load more (${Math.min(STOREFRONT_LISTING_CHUNK_SIZE, Math.max(0, catalogTotal - loaded.length))} more)`}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
