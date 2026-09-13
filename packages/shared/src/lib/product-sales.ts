import { FAST_SELLING_THRESHOLD } from "../constants";
import type { Product } from "../schemas/product";

/** Total units sold — only the counter incremented when orders are paid (never inferred from stock). */
export function getUnitsSold(product: Product): number {
  return product.unitsSold ?? 0;
}

/** In stock and at least FAST_SELLING_THRESHOLD real paid orders. */
export function isFastSelling(product: Product): boolean {
  return (product.inventory ?? 0) > 0 && getUnitsSold(product) >= FAST_SELLING_THRESHOLD;
}

export function sortByUnitsSold(a: Product, b: Product): number {
  return getUnitsSold(b) - getUnitsSold(a);
}
