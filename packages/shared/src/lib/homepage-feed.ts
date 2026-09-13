import type { HomepageSnapshot } from "../schemas/homepage-ranking";

/** First homepage response: enough for above-the-fold merchandising, not the full ranked pool. */
export const HOMEPAGE_FEED_INITIAL_LIMIT = 40;
/** Later requests as the shopper scrolls. */
export const HOMEPAGE_FEED_CHUNK_SIZE = 24;
export const HOMEPAGE_FEED_MAX_LIMIT = 48;
export const HOMEPAGE_CATEGORY_PREVIEW_LIMIT = 8;
export const HOMEPAGE_FAST_SELLING_LIMIT = 8;

export const HOMEPAGE_FIRST_PAINT_GROUPS = [
  { id: "pinned", limit: 8 },
  { id: "top", limit: 10 },
  { id: "trending", limit: 8 },
  { id: "best_sellers", limit: 10 },
  { id: "new", limit: 8 },
] as const;

/** Insert spice Hampers after this many featured catalog groups (4th homepage block after the banner). */
export const HOMEPAGE_HAMPERS_AFTER_FEATURED_GROUPS = 2;

export type HomepageFeedPage<T> = {
  items: T[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

/**
 * Featured first-paint slugs, then the rest of the ranked pool.
 * Pagination walks this list so the first page is merchandising, not 500 SKUs.
 */
export function buildHomepageFeedSlugs(
  snapshot: Pick<HomepageSnapshot, "groups" | "ranked">
): string[] {
  const seen = new Set<string>();
  const featured: string[] = [];

  for (const spec of HOMEPAGE_FIRST_PAINT_GROUPS) {
    const slugs = snapshot.groups.find((group) => group.id === spec.id)?.slugs ?? [];
    let taken = 0;
    for (const slug of slugs) {
      if (taken >= spec.limit) break;
      if (seen.has(slug)) continue;
      seen.add(slug);
      featured.push(slug);
      taken += 1;
    }
  }

  const rest = snapshot.ranked.filter((slug) => !seen.has(slug));
  return [...featured, ...rest];
}

export function paginateHomepageFeed<T>(
  items: T[],
  offset: number,
  limit: number
): HomepageFeedPage<T> {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const requested = Number.isFinite(limit) ? Math.floor(limit) : HOMEPAGE_FEED_INITIAL_LIMIT;
  const safeLimit = Math.min(HOMEPAGE_FEED_MAX_LIMIT, Math.max(1, requested));
  const slice = items.slice(safeOffset, safeOffset + safeLimit);
  return {
    items: slice,
    offset: safeOffset,
    limit: safeLimit,
    total: items.length,
    hasMore: safeOffset + slice.length < items.length,
  };
}

export function homepageProductsPath(query?: { limit?: number; offset?: number }): string {
  const qs = new URLSearchParams();
  if (query?.limit != null) qs.set("limit", String(query.limit));
  if (query?.offset != null) qs.set("offset", String(query.offset));
  const suffix = qs.toString();
  return suffix ? `/homepage/products?${suffix}` : "/homepage/products";
}

export function parseHomepageFeedQuery(query?: {
  limit?: string;
  offset?: string;
}): { limit: number; offset: number } {
  const offsetRaw = Number(query?.offset ?? 0);
  const limitRaw = Number(query?.limit ?? HOMEPAGE_FEED_INITIAL_LIMIT);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(HOMEPAGE_FEED_MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : HOMEPAGE_FEED_INITIAL_LIMIT;
  return { offset, limit };
}
