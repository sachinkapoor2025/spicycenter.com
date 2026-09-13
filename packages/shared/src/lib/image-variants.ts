/** Storefront / CDN image size standard — process once at upload, never on the hot path. */

export const IMAGE_VARIANT_NAMES = ["thumb", "card", "gallery", "zoom"] as const;
export type ImageVariantName = (typeof IMAGE_VARIANT_NAMES)[number];

export const IMAGE_VARIANT_PRESETS: Record<
  ImageVariantName,
  { width: number; quality: number; suffix: ImageVariantName }
> = {
  thumb: { width: 320, quality: 70, suffix: "thumb" },
  card: { width: 640, quality: 72, suffix: "card" },
  gallery: { width: 1200, quality: 78, suffix: "gallery" },
  zoom: { width: 1600, quality: 80, suffix: "zoom" },
};

/** Longest edge for the stored original (admin uploads + Lambda master cap). */
export const IMAGE_MASTER_MAX_EDGE_PX = 2000;
/** Reject / skip processing above this — 80MB TIFFs must never hit CloudFront. */
export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_PROCESS_MAX_BYTES = 25 * 1024 * 1024;
export const IMAGE_MASTER_TARGET_BYTES = 350_000;
export const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const IMAGE_VARIANT_KEY_RE = /\.(thumb|card|gallery|zoom)\.webp$/i;
export const IMAGE_OPTIMIZABLE_KEY_RE = /\.(jpe?g|png|webp|gif|tiff?)$/i;

const SKIP_PREFIXES = ["expenses/", "labels/", "wp-statistics/"];

export function isImageVariantKey(key: string): boolean {
  return IMAGE_VARIANT_KEY_RE.test(key.split("?")[0] ?? key);
}

export function isOptimizableImageKey(key: string): boolean {
  const clean = key.split("?")[0] ?? key;
  if (!IMAGE_OPTIMIZABLE_KEY_RE.test(clean)) return false;
  if (isImageVariantKey(clean)) return false;
  const lower = clean.replace(/^\/+/, "").toLowerCase();
  return !SKIP_PREFIXES.some((p) => lower.startsWith(p));
}

export function variantObjectKey(originalKey: string, variant: ImageVariantName): string {
  const trimmed = originalKey.replace(/^\/+/, "").split("?")[0] ?? originalKey;
  const withoutVariant = trimmed.replace(IMAGE_VARIANT_KEY_RE, "");
  const noExt = withoutVariant.replace(/\.[^.]+$/, "");
  return `${noExt}.${IMAGE_VARIANT_PRESETS[variant].suffix}.webp`;
}

export function allVariantObjectKeys(originalKey: string): string[] {
  return IMAGE_VARIANT_NAMES.map((name) => variantObjectKey(originalKey, name));
}

function isManagedMediaUrl(url: string): boolean {
  return (
    /cloudfront\.net\//i.test(url) ||
    /\/uploads\//i.test(url) ||
    /^uploads\//i.test(url) ||
    /\/products\//i.test(url) ||
    /\/blog\//i.test(url)
  );
}

/** Rewrite a CDN/original URL to the sized WebP sibling. Unknown hosts are left unchanged. */
export function productImageVariantUrl(url: string, variant: ImageVariantName): string {
  const trimmed = url.trim();
  if (!trimmed || !isManagedMediaUrl(trimmed)) return trimmed;
  if (isImageVariantKey(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    parsed.pathname = `/${variantObjectKey(parsed.pathname.replace(/^\/+/, ""), variant)}`;
    return parsed.toString();
  } catch {
    const path = trimmed.replace(/^\/+/, "");
    return `/${variantObjectKey(path, variant)}`;
  }
}
