import type { MetadataRoute } from "next";
import { buildApprovedSitemapEntries } from "@/lib/seo/sitemap-config";

/** Next.js serves this as `/sitemap.xml` (sitemap protocol urlset). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildApprovedSitemapEntries();
}
