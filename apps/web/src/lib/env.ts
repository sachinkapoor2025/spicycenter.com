/** Production API — fallback when Amplify build env vars are missing (London stack). */
export const PROD_API_URL = "https://5qzima7ctj.execute-api.eu-west-2.amazonaws.com/prod";

/** Official public origin. Sitemap, robots, and canonical URLs always use this host. */
export const CANONICAL_SITE_URL = "https://spicycenter.com";

/** Ensure execute-api URLs include the stage (e.g. /prod). */
export function normalizeApiUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.includes(".execute-api.") && !/\/(dev|staging|prod)$/.test(trimmed)) {
    return `${trimmed}/prod`;
  }
  return trimmed;
}

function readEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export function getApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return normalizeApiUrl(fromEnv);
  if (process.env.NODE_ENV === "production") return PROD_API_URL;
  return "http://localhost:3001";
}

function isOfficialSiteUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host === "spicycenter.com";
  } catch {
    return false;
  }
}

/**
 * Canonical site URL for SEO, sitemap, and Open Graph.
 * NEXT_PUBLIC_SITE_URL is accepted only for spicycenter.com. www is normalized to the apex.
 * Amplify, localhost, and any other host are ignored. Branch hostnames are never used.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && isOfficialSiteUrl(fromEnv)) return CANONICAL_SITE_URL;
  return CANONICAL_SITE_URL;
}

/** Production CDN — S3/CloudFront mirror for product images (WordPress no longer serves media). */
export const PROD_CDN_URL = "https://d2k0u32kgmw0nm.cloudfront.net";

/** CloudFront (or cdn.spicycenter.com) base for product/media images migrated off WordPress. */
export function getCdnUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CDN_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return PROD_CDN_URL;
  return PROD_CDN_URL;
}

export const siteUrl = getSiteUrl();
export const apiUrl = getApiUrl();

/** True while `next build` is prerendering pages (CI static generation). */
export function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.CI === "true";
}
