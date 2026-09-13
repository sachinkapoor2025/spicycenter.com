/** Public storefront catalog for imported CJ products (not admin live-CJ search). */
export const CJ_STOREFRONT_PRODUCTS_PATH = "/cj/products";

export function cjStorefrontProductsPath(query?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}): string {
  const qs = new URLSearchParams();
  if (query?.category) qs.set("category", query.category);
  if (query?.search) qs.set("search", query.search);
  if (query?.limit != null) qs.set("limit", String(query.limit));
  if (query?.offset != null) qs.set("offset", String(query.offset));
  if (query?.sort && query.sort !== "featured") qs.set("sort", query.sort);
  const suffix = qs.toString();
  return suffix ? `${CJ_STOREFRONT_PRODUCTS_PATH}?${suffix}` : CJ_STOREFRONT_PRODUCTS_PATH;
}

export function cjStorefrontProductPath(slug: string): string {
  return `${CJ_STOREFRONT_PRODUCTS_PATH}/${slug}`;
}

export function cjStorefrontProductVideosPath(slug: string): string {
  return `${cjStorefrontProductPath(slug)}/videos`;
}

export function cjStorefrontProductShippingPath(
  slug: string,
  query?: { country?: string; vid?: string; quantity?: string }
): string {
  const qs = new URLSearchParams();
  if (query?.country) qs.set("country", query.country);
  if (query?.vid) qs.set("vid", query.vid);
  if (query?.quantity) qs.set("quantity", query.quantity);
  const suffix = qs.toString();
  const path = `${cjStorefrontProductPath(slug)}/shipping`;
  return suffix ? `${path}?${suffix}` : path;
}
