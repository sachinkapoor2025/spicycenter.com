"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import {
  HOMEPAGE_FEED_CHUNK_SIZE,
  HOMEPAGE_FIRST_PAINT_GROUPS,
  HOMEPAGE_HAMPERS_AFTER_FEATURED_GROUPS,
  homepageProductsPath,
} from "@spicycorner/shared";
import { TrackedProductCard } from "@/components/TrackedProductCard";
import { api } from "@/lib/api";

type SnapshotGroup = { id: string; title: string; slugs: string[] };
type Snapshot = {
  generatedAt: string;
  poolSize: number;
  groups: SnapshotGroup[];
  ranked: string[];
};

type HomepageFeedResponse = {
  products: Product[];
  snapshot?: Snapshot;
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

function mergeProducts(current: Product[], incoming: Product[]): Product[] {
  const bySlug = new Map(current.map((p) => [p.slug, p]));
  for (const product of incoming) {
    if (!bySlug.has(product.slug)) bySlug.set(product.slug, product);
  }
  return [...bySlug.values()];
}

export function HomepageCatalog({
  products,
  snapshot,
  total,
  hasMore: initialHasMore,
  midSection,
  children,
}: {
  products: Product[];
  snapshot: Snapshot;
  total: number;
  hasMore: boolean;
  /** Rendered after the first two featured groups so Hampers sits 4th on the homepage. */
  midSection?: ReactNode;
  children?: ReactNode;
}) {
  const [loaded, setLoaded] = useState(products);
  const [offset, setOffset] = useState(products.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const bySlug = useMemo(() => new Map(loaded.map((p) => [p.slug, p])), [loaded]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await api<HomepageFeedResponse>(
        homepageProductsPath({ offset, limit: HOMEPAGE_FEED_CHUNK_SIZE })
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
  }, [hasMore, offset]);

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

  const shown = new Set<string>();
  const featuredBlocks = HOMEPAGE_FIRST_PAINT_GROUPS.map((spec) => {
    const group = snapshot.groups.find((g) => g.id === spec.id);
    if (!group) return null;
    const items = group.slugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is Product => p != null)
      .filter((p) => {
        if (shown.has(p.slug)) return false;
        shown.add(p.slug);
        return true;
      })
      .slice(0, spec.limit);
    if (items.length === 0) return null;
    return { ...group, items };
  }).filter((g): g is SnapshotGroup & { items: Product[] } => g != null);

  const remainder = loaded.filter((p) => !shown.has(p.slug));
  const hamperAt = Math.min(HOMEPAGE_HAMPERS_AFTER_FEATURED_GROUPS, featuredBlocks.length);

  const renderGroup = (group: SnapshotGroup & { items: Product[] }, groupIndex: number) => (
    <section key={group.id} className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="spice-heading text-xl md:text-2xl">{group.title}</h2>
        <Link href="/products" className="text-nav font-semibold text-sm hover:underline">
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
        {group.items.map((p, i) => (
          <TrackedProductCard
            key={`${group.id}-${p.slug}`}
            product={p}
            position={i + 1}
            listingPage="homepage"
            priority={groupIndex === 0 && i < 4}
            showFastSellingBadge={group.id === "trending" || group.id === "best_sellers"}
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      {featuredBlocks.slice(0, hamperAt).map((group, groupIndex) => renderGroup(group, groupIndex))}
      {midSection}
      {featuredBlocks.slice(hamperAt).map((group, i) => renderGroup(group, hamperAt + i))}

      {children}

      {(remainder.length > 0 || hasMore) && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="spice-heading text-xl md:text-2xl">More spice picks</h2>
            <p className="text-xs text-slate-500">
              Showing {loaded.length} of {total} ranked products
            </p>
          </div>
          {remainder.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
              {remainder.map((p, i) => (
                <TrackedProductCard
                  key={`more-${p.slug}`}
                  product={p}
                  position={featuredBlocks.reduce((n, g) => n + g.items.length, 0) + i + 1}
                  listingPage="homepage"
                />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-10" aria-hidden />
          {hasMore && (
            <div className="text-center mt-4">
              <button
                type="button"
                className="rounded-lg bg-nav px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => void loadMore()}
                disabled={loading}
              >
                {loading ? "Loading…" : `Load more (${Math.min(HOMEPAGE_FEED_CHUNK_SIZE, Math.max(0, total - loaded.length))} more)`}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
