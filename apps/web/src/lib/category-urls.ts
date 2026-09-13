/**
 * Storefront category URLs for SpicyCorner.
 * Uses `/categories/{slug}` — no usarakhi SEO path mapping.
 */
import { categoryOrder } from "@/lib/site";

export const CATEGORY_PUBLIC_SLUG: Record<string, string> = Object.fromEntries(
  categoryOrder.map((slug) => [slug, slug])
);

/** Storefront path for a category API slug. */
export function categoryHref(slug: string): string {
  return `/categories/${slug}`;
}

/** Resolve API slug from a public path segment (no slashes). */
export function categorySlugFromPublicSlug(publicSlug: string): string | undefined {
  if (publicSlug in CATEGORY_PUBLIC_SLUG) return publicSlug;
  return undefined;
}

export function categoriesMissingToUsaSuffix(): string[] {
  return [];
}

export function categoryRedirectRules(): {
  source: string;
  destination: string;
  statusCode: 301;
}[] {
  return [];
}

export function categoryRewriteRules(): { source: string; destination: string }[] {
  return [];
}
