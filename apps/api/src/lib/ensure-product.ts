/**
 * Resolve a product for storefront/cart: DynamoDB first, then auto-create from
 * bundled SpicyCorner catalog when missing.
 */
import { ensureCatalogProductInDb } from "./spicycorner-catalog";

export async function ensureProductInDb(slug: string): Promise<Record<string, unknown> | null> {
  return ensureCatalogProductInDb(slug);
}
