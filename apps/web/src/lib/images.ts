import { resolveProductImageUrl, resolveProductImageUrls } from "@spicycorner/shared";
import { getCdnUrl } from "./env";

/** Map legacy /wp-content/uploads media URLs to the S3/CloudFront CDN mirror. */
export function resolveImageUrl(url: string | undefined | null): string {
  return resolveProductImageUrl(url, getCdnUrl());
}

export function resolveImageUrls(urls: string[] | undefined | null): string[] {
  return resolveProductImageUrls(urls, getCdnUrl());
}
