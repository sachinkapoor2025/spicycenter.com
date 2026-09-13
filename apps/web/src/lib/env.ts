/** Production API — fallback when Amplify build env vars are missing */
export const PROD_API_URL = "https://c70qsnpe4g.execute-api.us-east-1.amazonaws.com/prod";

/** Amplify default URL for the branch being built (dev vs main). */
export function getAmplifyBranchUrl(): string | undefined {
  const branch = process.env.AWS_BRANCH?.trim();
  const appId = process.env.AWS_APP_ID?.trim();
  if (!branch || !appId) return undefined;
  return `https://${branch}.${appId}.amplifyapp.com`;
}

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

/**
 * Canonical site URL for SEO, sitemap, and Open Graph.
 * Prefer branch-specific Amplify env (main → spicycenter.com, dev → dev.*.amplifyapp.com).
 * Falls back to Amplify's AWS_BRANCH/AWS_APP_ID when NEXT_PUBLIC_SITE_URL is unset.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const amplifyBranch = getAmplifyBranchUrl();
  if (amplifyBranch && process.env.NODE_ENV === "production") return amplifyBranch;

  if (process.env.NODE_ENV === "production") return "https://spicycenter.com";
  return "http://localhost:3000";
}

/** Production CDN — S3/CloudFront mirror for product images (WordPress no longer serves media). */
export const PROD_CDN_URL = "https://d2lfdzx32wxe94.cloudfront.net";

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
