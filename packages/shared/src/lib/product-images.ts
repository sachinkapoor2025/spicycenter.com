/** Normalize image URLs for deduplication (path-only, case-insensitive). */
export function normalizeProductImageKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return decodeURIComponent(parsed.pathname).toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Admin portal uploads are stored under S3/CloudFront `products/<uuid>.<ext>`. */
export function isAdminUploadedProductImage(url: string): boolean {
  return /\/products\//i.test(url);
}

/**
 * Merge catalog/import images with existing DB images.
 * Import order first, then preserve admin uploads and any extra images already stored.
 */
export function mergeProductImages(imported: string[], existing: string[] = []): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  const add = (url: string) => {
    const key = normalizeProductImageKey(url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(url.trim());
  };

  for (const url of imported) add(url);
  for (const url of existing) add(url);

  return merged;
}

export type ResolveProductImagesForUpsertOptions = {
  /**
   * When true, replace the gallery with `incoming` (may shrink).
   * Default false — peak-season safe: merge and never drop existing gallery images.
   */
  allowShrink?: boolean;
};

/**
 * Safe image write helper for imports / product upserts.
 *
 * Default behavior (peak season):
 * - Merge incoming + existing URLs
 * - Never write fewer images than already stored
 * - Empty incoming keeps existing gallery
 *
 * Pass `{ allowShrink: true }` only for intentional full gallery replace.
 */
export function resolveProductImagesForUpsert(
  incoming: string[] | undefined,
  existing: string[] | undefined,
  options: ResolveProductImagesForUpsertOptions = {}
): { images: string[]; preservedExisting: boolean } {
  const incomingList = (Array.isArray(incoming) ? incoming : []).map((u) => u.trim()).filter(Boolean);
  const existingList = (Array.isArray(existing) ? existing : []).map((u) => u.trim()).filter(Boolean);

  if (options.allowShrink) {
    if (incomingList.length === 0) {
      return { images: existingList, preservedExisting: true };
    }
    return { images: incomingList, preservedExisting: false };
  }

  if (incomingList.length === 0 && existingList.length > 0) {
    return { images: existingList, preservedExisting: true };
  }

  const merged = mergeProductImages(incomingList, existingList);
  if (existingList.length > merged.length) {
    return { images: existingList, preservedExisting: true };
  }
  return { images: merged, preservedExisting: false };
}

/**
 * Drop vendor thumbnail assets (often 100×100) that get upscaled on listing cards / PDP.
 * Keep the largest frame(s) when the whole set is uniformly tiny.
 */
export const PRODUCT_IMAGE_MIN_EDGE_PX = 250;

export type SizedProductImage = {
  url: string;
  width: number;
  height: number;
};

export function shortEdge(width: number, height: number): number {
  if (!width || !height) return 0;
  return Math.min(width, height);
}

/** Prefer sharp gallery frames; fall back to the largest frame if all are tiny. */
export function selectDisplayableProductImages(entries: SizedProductImage[]): string[] {
  const valid = entries.filter((e) => e.url && e.width > 0 && e.height > 0);
  if (valid.length === 0) return [];

  const sharp = valid.filter((e) => shortEdge(e.width, e.height) >= PRODUCT_IMAGE_MIN_EDGE_PX);
  if (sharp.length > 0) return sharp.map((e) => e.url);

  let best = 0;
  for (const e of valid) best = Math.max(best, e.width * e.height);
  return valid.filter((e) => e.width * e.height === best).map((e) => e.url);
}
