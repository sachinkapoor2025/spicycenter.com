import type { MetadataRoute } from "next";
import { allCountrySeoSlugs } from "@/lib/content/country-pages";
import { loadComparisons } from "@/lib/content/comparisons";
import { listJournalPosts } from "@/lib/content/journal-posts";
import { listAllBlogPosts } from "@/lib/content/seo-blog";
import { WHOLESALE_SLUGS } from "@/lib/content/wholesale-landings";
import { FOOD_FAMILIES } from "@/lib/food-families";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { loadKeywordMarkets, loadKeywordProducts } from "@/lib/keyword-universe";
import { loadRecipes } from "@/lib/recipes";
import { categoryOrder, exploreCategories, regionLinks } from "@/lib/site";
import { SOURCING_GUIDES } from "@/lib/sourcing-guides";
import { loadPublishedSpiceEntities } from "@/lib/spice-data";

/** Production canonical origin for sitemap and robots. */
export const SITEMAP_ORIGIN = "https://www.spicycenter.com";

export const SITEMAP_XML_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type ApprovedSitemapPath = {
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

/**
 * Hardcoded indexable hubs that exist as App Router pages on spicycenter.com.
 * Redirect-only paths, private apps, and other-site URLs are not listed here.
 */
export const SITEMAP_STATIC_PATHS: readonly ApprovedSitemapPath[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.9 },
  { path: "/spices", changeFrequency: "daily", priority: 0.95 },
  { path: "/spice-supplier", changeFrequency: "weekly", priority: 0.9 },
  { path: "/wholesale", changeFrequency: "weekly", priority: 0.85 },
  { path: "/bulk-enquiry", changeFrequency: "weekly", priority: 0.85 },
  { path: "/enquiry", changeFrequency: "weekly", priority: 0.85 },
  { path: "/markets", changeFrequency: "weekly", priority: 0.85 },
  { path: "/food", changeFrequency: "weekly", priority: 0.75 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.75 },
  { path: "/legal/food-information", changeFrequency: "monthly", priority: 0.7 },
  { path: "/legal/allergens", changeFrequency: "monthly", priority: 0.7 },
  { path: "/legal/shipping", changeFrequency: "monthly", priority: 0.7 },
  { path: "/legal/returns", changeFrequency: "monthly", priority: 0.7 },
  { path: "/legal/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/legal/terms", changeFrequency: "monthly", priority: 0.4 },
  { path: "/spice-guide", changeFrequency: "weekly", priority: 0.9 },
  { path: "/spice-market-prices", changeFrequency: "daily", priority: 0.85 },
  { path: "/spice-finder", changeFrequency: "monthly", priority: 0.8 },
  { path: "/recipes", changeFrequency: "weekly", priority: 0.8 },
  { path: "/journal", changeFrequency: "weekly", priority: 0.8 },
  { path: "/spice-guide/comparisons", changeFrequency: "weekly", priority: 0.8 },
  { path: "/indian-spice-regions", changeFrequency: "monthly", priority: 0.8 },
  { path: "/uk", changeFrequency: "monthly", priority: 0.8 },
  { path: "/eu", changeFrequency: "monthly", priority: 0.7 },
  { path: "/reviews", changeFrequency: "weekly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/shipping", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/returns", changeFrequency: "monthly", priority: 0.5 },
  { path: "/press", changeFrequency: "monthly", priority: 0.5 },
];

/** Paths and prefixes that must never appear in the sitemap. */
export const SITEMAP_EXCLUDED_PATH_PREFIXES: readonly string[] = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/wishlist",
  "/orders",
  "/login",
  "/register",
  "/ses-email",
  "/bulk-enquiry/confirm",
  "/unsubscribe",
  "/keyword-map",
  "/cities",
  "/spice-guide/compare",
  "/uk/indian-spices",
  "/uk/indian-spices-wholesale",
  "/uk/bulk-indian-spices",
  "/europe/bulk-indian-spices",
  "/bulk-spices",
  "/llms.txt",
  "/llms-full.txt",
  "/humans.txt",
];

export function sitemapUrl(path: string): string {
  if (path === "/") return SITEMAP_ORIGIN;
  return `${SITEMAP_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isExcludedSitemapPath(path: string): boolean {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return SITEMAP_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => normalised === prefix || normalised.startsWith(`${prefix}/`)
  );
}

function sitemapDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function entry(
  path: string,
  changeFrequency: SitemapChangeFrequency,
  priority: number,
  lastModified?: Date
): MetadataRoute.Sitemap[number] | null {
  if (!path || isExcludedSitemapPath(path)) return null;
  return {
    url: sitemapUrl(path),
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
  };
}

function uniqueEntries(rows: Array<MetadataRoute.Sitemap[number] | null>): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const row of rows) {
    if (!row?.url || seen.has(row.url)) continue;
    if (!row.url.startsWith(`${SITEMAP_ORIGIN}/`) && row.url !== SITEMAP_ORIGIN) continue;
    seen.add(row.url);
    out.push(row);
  }
  return out;
}

/**
 * Approved sitemap rows: hardcoded hubs plus parameterized routes that this
 * App Router actually generates (same sources as generateStaticParams).
 */
function safeCollect(collect: () => void): void {
  try {
    collect();
  } catch {
    // A single data source must not 500 the public sitemap.
  }
}

export async function buildApprovedSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const rows: Array<MetadataRoute.Sitemap[number] | null> = SITEMAP_STATIC_PATHS.map((item) =>
    entry(item.path, item.changeFrequency, item.priority, now)
  );

  safeCollect(() => {
    for (const slug of categoryOrder) {
      rows.push(entry(`/categories/${slug}`, "weekly", 0.85, now));
    }
  });

  safeCollect(() => {
    for (const slug of allCountrySeoSlugs()) {
      rows.push(entry(`/countries/${slug}`, "weekly", 0.8, now));
    }
  });

  safeCollect(() => {
    for (const slug of WHOLESALE_SLUGS) {
      rows.push(entry(`/wholesale/${slug}`, "monthly", 0.75, now));
    }
  });

  safeCollect(() => {
    for (const market of loadKeywordMarkets()) {
      rows.push(entry(`/markets/${market.slug}`, "monthly", 0.75, now));
    }
  });

  safeCollect(() => {
    for (const product of loadKeywordProducts()) {
      rows.push(entry(`/sourcing/${product.slug}`, "monthly", 0.75, now));
    }
  });

  safeCollect(() => {
    for (const family of FOOD_FAMILIES) {
      rows.push(entry(`/food/${family.slug}`, "monthly", 0.7, now));
    }
  });

  safeCollect(() => {
    for (const guide of SOURCING_GUIDES) {
      rows.push(entry(`/guides/${guide.slug}`, "monthly", 0.7, now));
    }
  });

  safeCollect(() => {
    for (const spice of loadPublishedSpiceEntities()) {
      rows.push(entry(`/spice-guide/${spice.slug}`, "monthly", 0.8, now));
      rows.push(entry(`/spices/${spice.slug}`, "weekly", 0.85, now));
    }
  });

  safeCollect(() => {
    for (const category of exploreCategories) {
      if (category.href === "/bulk-spices") continue;
      rows.push(entry(category.href, "weekly", 0.85, now));
    }
  });

  safeCollect(() => {
    for (const recipe of loadRecipes()) {
      rows.push(entry(`/recipes/${recipe.slug}`, "monthly", 0.7, now));
    }
  });

  safeCollect(() => {
    for (const comparison of loadComparisons()) {
      rows.push(entry(`/spice-guide/comparisons/${comparison.slug}`, "monthly", 0.75, now));
    }
  });

  safeCollect(() => {
    for (const post of listJournalPosts()) {
      rows.push(entry(`/journal/${post.slug}`, "monthly", 0.7, sitemapDate(post.updatedAt)));
    }
  });

  safeCollect(() => {
    for (const post of listAllBlogPosts()) {
      rows.push(entry(`/blog/${post.slug}`, "monthly", 0.7, sitemapDate(post.updatedAt)));
    }
  });

  safeCollect(() => {
    for (const region of regionLinks) {
      rows.push(entry(`/indian-spice-regions/${region.slug}`, "monthly", 0.75, now));
    }
  });

  safeCollect(() => {
    for (const product of getCatalogProducts()) {
      rows.push(entry(`/products/${product.slug}`, "weekly", 0.8, sitemapDate(product.updatedAt)));
    }
  });

  return uniqueEntries(rows);
}

export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((item) => {
      const lastmod =
        item.lastModified instanceof Date
          ? item.lastModified.toISOString()
          : item.lastModified
            ? new Date(item.lastModified).toISOString()
            : undefined;
      const changefreq = item.changeFrequency ? `\n    <changefreq>${item.changeFrequency}</changefreq>` : "";
      const priority = typeof item.priority === "number" ? `\n    <priority>${item.priority.toFixed(1)}</priority>` : "";
      const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${item.url}</loc>${lastmodTag}${changefreq}${priority}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_XML_NAMESPACE}">\n${body}\n</urlset>\n`;
}
