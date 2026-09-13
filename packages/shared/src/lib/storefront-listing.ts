import { HOMEPAGE_FEED_MAX_LIMIT } from "./homepage-feed";

/** First shop/category response: a grid, not the full catalog. */
export const STOREFRONT_LISTING_INITIAL_LIMIT = 24;
export const STOREFRONT_LISTING_CHUNK_SIZE = 24;
export const STOREFRONT_LISTING_MAX_LIMIT = HOMEPAGE_FEED_MAX_LIMIT;
export const STOREFRONT_RELATED_LIMIT = 8;
export const STOREFRONT_GEO_PREVIEW_LIMIT = 24;
export const STOREFRONT_ASSISTANT_SEARCH_LIMIT = 48;

export const STOREFRONT_LISTING_SORTS = [
  "featured",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
] as const;

export type StorefrontListingSort = (typeof STOREFRONT_LISTING_SORTS)[number];

export type StorefrontListingPage<T> = {
  items: T[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export function isStorefrontListingSort(value: string | undefined): value is StorefrontListingSort {
  return value != null && (STOREFRONT_LISTING_SORTS as readonly string[]).includes(value);
}

export function parseStorefrontListingSort(value?: string): StorefrontListingSort {
  return isStorefrontListingSort(value) ? value : "featured";
}

export function parseStorefrontListingQuery(query?: {
  limit?: string;
  offset?: string;
  sort?: string;
}): { limit?: number; offset: number; sort: StorefrontListingSort } {
  const offsetRaw = Number(query?.offset ?? 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  const sort = parseStorefrontListingSort(query?.sort);
  if (query?.limit == null || query.limit === "") {
    return { offset, sort };
  }
  const limitRaw = Number(query.limit);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(STOREFRONT_LISTING_MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : STOREFRONT_LISTING_INITIAL_LIMIT;
  return { offset, sort, limit };
}

export function sortStorefrontListing<T extends { name: string; price: number }>(
  items: T[],
  sort: StorefrontListingSort
): T[] {
  const list = [...items];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "name-asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return list;
  }
}

export function paginateStorefrontListing<T>(
  items: T[],
  offset: number,
  limit: number
): StorefrontListingPage<T> {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const requested = Number.isFinite(limit) ? Math.floor(limit) : STOREFRONT_LISTING_INITIAL_LIMIT;
  const safeLimit = Math.min(STOREFRONT_LISTING_MAX_LIMIT, Math.max(1, requested));
  const slice = items.slice(safeOffset, safeOffset + safeLimit);
  return {
    items: slice,
    offset: safeOffset,
    limit: safeLimit,
    total: items.length,
    hasMore: safeOffset + slice.length < items.length,
  };
}
