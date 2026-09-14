import {
  STOREFRONT_GEO_PREVIEW_LIMIT,
  STOREFRONT_LISTING_INITIAL_LIMIT,
  STOREFRONT_RELATED_LIMIT,
  cjStorefrontProductPath,
  cjStorefrontProductsPath,
  paginateStorefrontListing,
  parseStorefrontListingSort,
  sortStorefrontListing,
  type Product,
  type StorefrontListingSort,
} from "@spicycorner/shared";
import { getCdnUrl, isNextProductionBuild } from "./env";
import { resolveImageUrls } from "./images";
import { api } from "./api";
import {
  getCatalogProduct,
  getCatalogProducts,
  getCatalogProductsByCategory,
} from "./catalog-fallback";
import { filterDisplayableProductImages, isPlaceholderProductImage } from "./product-images";
import { spiceStockImagesForProduct } from "./spice-stock-images";

/**
 * Always use absolute CloudFront URLs on storefront listings/PDP.
 * Amplify `/uploads/...` often contains the missing-image placeholder JPEG for missing files.
 */
function toListingImageUrl(url: string): string {
  const cdn = getCdnUrl();
  const resolved = resolveImageUrls([url])[0] || url.trim();
  if (!resolved) return "";
  if (resolved.startsWith("/uploads/")) return `${cdn}${resolved}`;
  if (resolved.startsWith("uploads/")) return `${cdn}/${resolved}`;
  if (isPlaceholderProductImage(resolved)) return "";
  return resolved;
}

/** Map stored paths to working display URLs; drop missing-image placeholders. */
function withDisplayImages(product: Product): Product {
  const cleaned = filterDisplayableProductImages(product.images);
  const resolved = cleaned.map(toListingImageUrl).filter(Boolean);
  const cjVariants = product.cjVariants?.map((variant) => ({
    ...variant,
    ...(variant.image ? { image: toListingImageUrl(variant.image) || variant.image } : {}),
  }));
  return {
    ...product,
    images: resolved.length > 0 ? resolved : spiceStockImagesForProduct(product),
    ...(cjVariants ? { cjVariants } : {}),
  };
}

/**
 * Admin / DynamoDB is the source of truth for product images.
 * Catalog JSON is only used when the API is unreachable (build/offline fallback).
 */
export async function loadProduct(slug: string): Promise<Product | null> {
  try {
    const data = await api<{ product: Product }>(cjStorefrontProductPath(slug), { revalidate: false });
    return withDisplayImages(data.product);
  } catch {
    const catalog = getCatalogProduct(slug);
    return catalog ? withDisplayImages(catalog) : null;
  }
}

export async function loadRelatedProducts(categorySlug: string, excludeSlug: string): Promise<Product[]> {
  try {
    const data = await api<{ products: Product[] }>(
      cjStorefrontProductsPath({ category: categorySlug, limit: STOREFRONT_RELATED_LIMIT }),
      { revalidate: false }
    );
    const related = (data.products ?? []).filter((p) => p.slug !== excludeSlug).slice(0, 5);
    if (related.length > 0) return related.map(withDisplayImages);
  } catch {
    // fall through to catalog
  }
  return getCatalogProductsByCategory(categorySlug)
    .filter((p) => p.slug !== excludeSlug)
    .slice(0, 5)
    .map(withDisplayImages);
}

export type StorefrontListingResult = {
  products: Product[];
  total: number;
  hasMore: boolean;
};

function listingFromCatalog(
  all: Product[],
  opts: { limit: number; offset?: number; sort?: StorefrontListingSort; search?: string }
): StorefrontListingResult {
  let items = all;
  const search = opts.search?.trim().toLowerCase();
  if (search) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.tags?.some((t) => t.toLowerCase().includes(search))
    );
  }
  const sorted = sortStorefrontListing(items, opts.sort ?? "featured");
  const page = paginateStorefrontListing(sorted, opts.offset ?? 0, opts.limit);
  return {
    products: withListingImages(page.items),
    total: page.total,
    hasMore: page.hasMore,
  };
}

/** First page of a shop/category/search grid. Later chunks load in the client. */
export async function loadStorefrontListing(query: {
  category?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  revalidate?: number | false;
}): Promise<StorefrontListingResult> {
  const limit = query.limit ?? STOREFRONT_LISTING_INITIAL_LIMIT;
  const offset = query.offset ?? 0;
  const sort = parseStorefrontListingSort(query.sort);
  try {
    const data = await api<{
      products: Product[];
      total?: number;
      hasMore?: boolean;
    }>(
      cjStorefrontProductsPath({
        ...(query.category ? { category: query.category } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(sort !== "featured" ? { sort } : {}),
        limit,
        offset,
      }),
      { revalidate: query.revalidate }
    );
    const incoming = withListingImages(data.products ?? []);
    const products = incoming.slice(0, limit);
    const total = data.total ?? incoming.length;
    if (products.length === 0) {
      const all = query.category ? getCatalogProductsByCategory(query.category) : getCatalogProducts();
      const fallback = listingFromCatalog(all, { limit, offset, sort, search: query.search });
      if (fallback.products.length > 0) return fallback;
    }
    return {
      products,
      total,
      hasMore:
        Boolean(data.hasMore) ||
        incoming.length > limit ||
        offset + products.length < total,
    };
  } catch {
    const all = query.category ? getCatalogProductsByCategory(query.category) : getCatalogProducts();
    return listingFromCatalog(all, { limit, offset, sort, search: query.search });
  }
}

/** Small merchandising set for city / geo pages — not the full catalog. */
export async function loadStorefrontProductPreview(
  limit = STOREFRONT_GEO_PREVIEW_LIMIT
): Promise<Product[]> {
  const page = await loadStorefrontListing({ limit, revalidate: 3600 });
  return page.products;
}

/** Prefer catalog slugs at build time — avoids CI/API rate-limit prerender failures. */
export function getStaticProductSlugs(): string[] {
  const fromCatalog = getCatalogProducts().map((p) => p.slug);
  if (fromCatalog.length > 0) return fromCatalog;
  return [];
}

/** Apply display image cleanup for listing pages that load products from the API. */
export function withListingImages(products: Product[]): Product[] {
  return products.map(withDisplayImages);
}

let storefrontProductsPromise: Promise<Product[]> | null = null;

/**
 * Shared catalog for SSG listing pages (cities, spice geo, sitemap).
 * During `next build`, skip the live API — hundreds of pages fetching `/cj/products`
 * stampede Lambda and exceed Next.js's 60s static page timeout.
 */
export function loadStorefrontProducts(): Promise<Product[]> {
  if (!storefrontProductsPromise) {
    storefrontProductsPromise = loadStorefrontProductsOnce();
  }
  return storefrontProductsPromise;
}

async function loadStorefrontProductsOnce(): Promise<Product[]> {
  const fromCatalog = () => withListingImages(getCatalogProducts());
  if (isNextProductionBuild()) {
    return fromCatalog();
  }
  try {
    const data = await api<{ products: Product[] }>(cjStorefrontProductsPath(), { revalidate: 3600 });
    if (data.products.length > 0) return withListingImages(data.products);
  } catch {
    // fall through
  }
  return fromCatalog();
}
