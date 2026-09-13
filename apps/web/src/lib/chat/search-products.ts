import {
  buildSearchQuery,
  cjStorefrontProductPath,
  cjStorefrontProductsPath,
  STOREFRONT_ASSISTANT_SEARCH_LIMIT,
  isProductAvailableForCountry,
  scoreProductForState,
  toAssistantProduct,
  type AssistantProduct,
  type Product,
  type ShoppingState,
} from "@spicycorner/shared";
import { getApiUrl, PROD_API_URL, normalizeApiUrl } from "@/lib/env";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { resolveImageUrl } from "@/lib/images";
import { filterDisplayableProductImages } from "@/lib/product-images";

const SEARCH_TIMEOUT_MS = 4000;
const liveCache = new Map<string, { at: number; products: Product[] }>();
const LIVE_TTL_MS = 5 * 60 * 1000;

function withImage(product: AssistantProduct): AssistantProduct {
  const image = product.image ? resolveImageUrl(product.image) : undefined;
  return { ...product, image: image || undefined };
}

function liveSearchToken(state: ShoppingState): string {
  if (state.theme) return state.theme.slice(0, 40);
  const stop = new Set(["spice", "spice", "spices", "for", "the", "and", "with", "under"]);
  const q = buildSearchQuery(state);
  return (
    q
      .split(/\s+/)
      .find((w) => w.length > 2 && !stop.has(w.toLowerCase()))
      ?.slice(0, 40) ?? ""
  );
}

function filterCatalog(state: ShoppingState, country?: string): Product[] {
  const q = buildSearchQuery(state).toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  return getCatalogProducts().filter((p) => {
    if (p.published === false || (p.inventory ?? 0) <= 0) return false;
    if (country && isProductAvailableForCountry(p, country) === "unavailable") return false;
    if (state.categorySlug && p.categorySlug !== state.categorySlug && !p.additionalCategorySlugs?.includes(state.categorySlug)) {
      return false;
    }
    if (state.budgetMax != null && p.price > state.budgetMax * 1.15) return false;
    const hay = `${p.name} ${p.tags?.join(" ") ?? ""}`.toLowerCase();
    if (words.length && !words.some((w) => hay.includes(w))) return false;
    return true;
  });
}

function apiBases(): string[] {
  const primary = normalizeApiUrl(getApiUrl());
  const bases = [primary];
  const prod = normalizeApiUrl(PROD_API_URL);
  if (primary.includes("localhost") && prod !== primary) bases.push(prod);
  return bases;
}

async function fetchProductsOnce(path: string): Promise<Product[]> {
  const cached = liveCache.get(path);
  if (cached && Date.now() - cached.at < LIVE_TTL_MS) return cached.products;
  for (const base of apiBases()) {
    try {
      const res = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { products?: Product[] };
      const products = data.products ?? [];
      liveCache.set(path, { at: Date.now(), products });
      return products;
    } catch {
      continue;
    }
  }
  return [];
}

async function searchLiveApi(state: ShoppingState): Promise<Product[]> {
  const token = liveSearchToken(state);
  if (!state.categorySlug && !token) return [];
  return fetchProductsOnce(
    cjStorefrontProductsPath({
      ...(state.categorySlug ? { category: state.categorySlug } : {}),
      ...(token ? { search: token } : {}),
      limit: STOREFRONT_ASSISTANT_SEARCH_LIMIT,
    })
  );
}

function rankProducts(
  products: Product[],
  state: ShoppingState,
  country: string | undefined,
  exclude: Set<string>
) {
  return products
    .filter((p) => !exclude.has(p.slug) && p.published !== false && (p.inventory ?? 0) > 0)
    .map((p) => ({ p, score: scoreProductForState(p, state, country) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
}

function toCards(rows: { p: Product }[]): AssistantProduct[] {
  return rows.map((row) => {
    const images = filterDisplayableProductImages(row.p.images);
    return withImage(toAssistantProduct({ ...row.p, images }));
  });
}

export async function searchAssistantProducts(
  state: ShoppingState,
  opts: { country?: string; limit?: number; excludeSlugs?: string[] }
): Promise<{ products: AssistantProduct[]; query: string; unfulfilled: boolean }> {
  const query = buildSearchQuery(state);
  const limit = opts.limit ?? 5;
  const exclude = new Set(opts.excludeSlugs ?? []);

  const [live, local] = await Promise.all([searchLiveApi(state), Promise.resolve(filterCatalog(state, opts.country))]);
  const bySlug = new Map<string, Product>();
  for (const p of local) bySlug.set(p.slug, p);
  for (const p of live) bySlug.set(p.slug, p);

  let ranked = rankProducts([...bySlug.values()], state, opts.country, exclude);

  if (ranked.length === 0 && state.categorySlug) {
    const broaderLive = await fetchProductsOnce(
      cjStorefrontProductsPath({ category: state.categorySlug, limit: STOREFRONT_ASSISTANT_SEARCH_LIMIT })
    );
    ranked = rankProducts(broaderLive, { ...state, budgetMax: undefined, style: undefined }, opts.country, exclude);
  }

  if (ranked.length === 0 && (state.theme || state.query)) {
    ranked = rankProducts(
      getCatalogProducts(),
      { ...state, budgetMax: undefined, style: undefined },
      opts.country,
      exclude
    ).filter((row) => row.score >= 6);
  }

  const products = toCards(ranked.slice(0, limit));
  return {
    products,
    query,
    unfulfilled: products.length === 0,
  };
}

export async function getAssistantProduct(slug: string): Promise<AssistantProduct | null> {
  for (const base of apiBases()) {
    try {
      const res = await fetch(`${base}${cjStorefrontProductPath(slug)}`, {
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { product?: Product };
      if (!data.product) continue;
      const images = filterDisplayableProductImages(data.product.images);
      return withImage(toAssistantProduct({ ...data.product, images }));
    } catch {
      continue;
    }
  }
  const fromCatalog = getCatalogProducts().find((p) => p.slug === slug);
  if (!fromCatalog) return null;
  const images = filterDisplayableProductImages(fromCatalog.images);
  return withImage(toAssistantProduct({ ...fromCatalog, images }));
}
