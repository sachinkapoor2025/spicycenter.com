/**
 * Orange County / usarakhi hamper catalog — disabled for SpicyCenter.
 * Typed stubs keep vendor handlers compiling without importing usarakhi product data.
 */

export type OrangeCountyCatalogProduct = {
  slug: string;
  sku?: string;
  images?: string[];
  vendorCost?: number;
  weightOz?: number;
  categorySlug?: string;
};

export function getBundledOrangeCountyProduct(
  _slug: string
): OrangeCountyCatalogProduct | undefined {
  return undefined;
}

export async function ensureOrangeCountyProductInDb(
  _slug: string
): Promise<Record<string, unknown> | null> {
  return null;
}
