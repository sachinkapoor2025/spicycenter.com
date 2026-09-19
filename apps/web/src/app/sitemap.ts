import type { MetadataRoute } from "next";
import { loadStorefrontProducts } from "@/lib/product-loader";
import { siteUrl } from "@/lib/env";
import { categoryOrder } from "@/lib/site";
import { blogPosts } from "@/lib/content/blog-posts";
import { seoBlogEntries, seoEventsHub } from "@/lib/content/seo-data";
import { allCountrySeoSlugs } from "@/lib/content/country-pages";
import { loadPublishedSpiceEntities } from "@/lib/spice-data";
import { FOOD_FAMILIES } from "@/lib/food-families";
import { SOURCING_GUIDES } from "@/lib/sourcing-guides";
import { loadRecipes } from "@/lib/recipes";
import { loadComparisons } from "@/lib/content/comparisons";
import { listJournalPosts } from "@/lib/content/journal-posts";
import { loadKeywordMarkets, loadKeywordProducts } from "@/lib/keyword-universe";

function sitemapDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Handwritten + SEO blog posts, deduped by slug. */
function mergedBlogRoutes(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const routes: MetadataRoute.Sitemap = [];

  for (const p of blogPosts) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    routes.push({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: sitemapDate(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const p of seoBlogEntries) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    routes.push({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return routes;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/spices`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${siteUrl}/spice-supplier`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/wholesale/uk`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/wholesale/restaurants`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/bulk-enquiry`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/enquiry`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/markets`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/keyword-map`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${siteUrl}/food`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${siteUrl}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${siteUrl}/legal/food-information`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/legal/allergens`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/spice-guide`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/spice-market-prices`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${siteUrl}/spice-finder`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/recipes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/journal`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/spice-guide/comparisons`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/indian-spice-regions`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/uk`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/eu`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/shipping`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${siteUrl}${seoEventsHub.hubPath}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/returns`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/press`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${siteUrl}/llms-full.txt`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${siteUrl}/humans.txt`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryRoutes = categoryOrder.map((slug) => ({
    url: `${siteUrl}/categories/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const countryRoutes = allCountrySeoSlugs().map((slug) => ({
    url: `${siteUrl}/countries/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const marketRoutes = loadKeywordMarkets().map((m) => ({
    url: `${siteUrl}/markets/${m.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const sourcingRoutes = loadKeywordProducts().map((p) => ({
    url: `${siteUrl}/sourcing/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const foodRoutes = FOOD_FAMILIES.map((f) => ({
    url: `${siteUrl}/food/${f.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const guideRoutes = SOURCING_GUIDES.map((g) => ({
    url: `${siteUrl}/guides/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogRoutes = mergedBlogRoutes();

  const spiceGuideRoutes = loadPublishedSpiceEntities().map((s) => ({
    url: `${siteUrl}/spice-guide/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  const spiceShopRoutes = loadPublishedSpiceEntities().map((s) => ({
    url: `${siteUrl}/spices/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const recipeRoutes: MetadataRoute.Sitemap = loadRecipes().map((r) => ({
    url: `${siteUrl}/recipes/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  const comparisonRoutes: MetadataRoute.Sitemap = loadComparisons().map((c) => ({
    url: `${siteUrl}/spice-guide/comparisons/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));
  const journalRoutes: MetadataRoute.Sitemap = listJournalPosts().map((p) => ({
    url: `${siteUrl}/journal/${p.slug}`,
    lastModified: sitemapDate(p.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const products = await loadStorefrontProducts();
  const productRoutes = products.map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: sitemapDate(p.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...countryRoutes,
    ...marketRoutes,
    ...sourcingRoutes,
    ...foodRoutes,
    ...guideRoutes,
    ...spiceGuideRoutes,
    ...spiceShopRoutes,
    ...recipeRoutes,
    ...comparisonRoutes,
    ...journalRoutes,
    ...blogRoutes,
    ...productRoutes,
  ];
}
