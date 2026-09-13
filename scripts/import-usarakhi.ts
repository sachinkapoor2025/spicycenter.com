/**
 * Import categories + products from spicycenter.com (WooCommerce Store API)
 * into DynamoDB. Also writes scripts/data/usarakhi-catalog.json for local seed.
 *
 * Usage:
 *   npm run import:usarakhi -- --fetch-only           # refresh catalog JSON
 *   ENVIRONMENT=prod npm run import:usarakhi          # import to AWS (prod tables)
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { productKeys, categoryKeys, configKeys, defaultPaymentConfig, metaDescription } from "@spicycorner/shared";

const CATALOG_PATH = join(process.cwd(), "scripts/data/usarakhi-catalog.json");
const WC_BASE = "https://spicycenter.com/wp-json/wc/store/v1";

const MAIN_CATEGORY_SLUGS = new Set([
  "party-supplies",
  "spices",
  "spices",
  "spices",
  "accessories",
]);

/** Fetch more specific categories first so duplicates keep the best assignment. */
const CATEGORY_FETCH_ORDER = [
  "spices",
  "spices",
  "spices",
  "accessories",
  "party-supplies",
] as const;

interface WcCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

interface WcProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  on_sale: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  images: { src: string; alt: string }[];
  categories: { name: string; slug: string }[];
  tags: { name: string }[];
}

interface CatalogCategory {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

interface CatalogProduct {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: "USD" | "INR";
  categorySlug: string;
  images: string[];
  sku?: string;
  inventory: number;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–");
}

function toPrice(raw: string, minorUnit: number): number {
  return Number(raw) / Math.pow(10, minorUnit);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Scrape WooCommerce product gallery (data-large_image) — Store API often returns only 1 image. */
function isProductGalleryImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.includes("/wp-content/uploads/")) return false;
  if (lower.includes("logo") || lower.includes("border-banner") || lower.includes("cropped-transparent")) {
    return false;
  }
  // Skip tiny favicon / icon sizes
  if (/-(?:32x32|100x100|150x150|180x180|192x192|300x300)\.(?:png|jpe?g|webp)/i.test(url)) return false;
  return true;
}

async function fetchGalleryImages(slug: string): Promise<string[]> {
  try {
    const res = await fetch(`https://spicycenter.com/product/${encodeURIComponent(slug)}/`, {
      headers: { "User-Agent": "SpicyCorner-Catalog-Import/1.0" },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const start = html.indexOf("woocommerce-product-gallery");
    if (start < 0) return [];

    let end = html.length;
    for (const marker of ['class="related', "related products", "upsells products"]) {
      const i = html.indexOf(marker, start + 80);
      if (i > start && i < end) end = i;
    }

    const chunk = html.slice(start, end);
    const urls: string[] = [];
    for (const m of chunk.matchAll(/data-large_image="([^"]+)"/g)) {
      const url = m[1];
      if (isProductGalleryImage(url) && !urls.includes(url)) urls.push(url);
    }
    return urls;
  } catch {
    return [];
  }
}

function normalizeImageKey(url: string): string {
  return url.replace(/-\d+x\d+(\.(?:png|jpe?g|webp))/i, "$1");
}

async function fetchStoreProductImages(slug: string): Promise<string[]> {
  try {
    const data = await fetchJson<WcProduct[]>(
      `${WC_BASE}/products?slug=${encodeURIComponent(slug)}`
    );
    const product = data[0];
    if (!product) return [];
    return product.images.map((img) => img.src).filter(isProductGalleryImage);
  } catch {
    return [];
  }
}

async function enrichProductImages(products: CatalogProduct[]): Promise<void> {
  const concurrency = 8;
  let index = 0;
  let multi = 0;

  async function worker() {
    while (index < products.length) {
      const i = index++;
      const product = products[i];
      const [gallery, store] = await Promise.all([
        fetchGalleryImages(product.slug),
        fetchStoreProductImages(product.slug),
      ]);
      const merged: string[] = [];
      const seen = new Set<string>();
      for (const url of [...store, ...gallery, ...product.images]) {
        if (!isProductGalleryImage(url)) continue;
        const key = normalizeImageKey(url);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(url);
      }
      if (merged.length > 0) {
        product.images = merged;
        if (merged.length > 1) multi++;
      }
      if ((i + 1) % 25 === 0) console.log(`  Gallery images: ${i + 1}/${products.length}...`);
    }
  }

  console.log(`Fetching product gallery images for ${products.length} products...`);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`Gallery complete: ${multi} products with multiple images`);
}

function toCatalogProduct(p: WcProduct, fallbackCategorySlug: string): CatalogProduct {
  const minor = p.prices.currency_minor_unit ?? 2;
  const price = toPrice(p.prices.price, minor);
  const regular = toPrice(p.prices.regular_price, minor);
  const explicitCat = p.categories.find((c) => MAIN_CATEGORY_SLUGS.has(c.slug));
  const plainDesc = stripHtml(p.description);

  return {
    name: decodeEntities(p.name),
    slug: p.slug,
    description: plainDesc,
    price,
    compareAtPrice: p.on_sale && regular > price ? regular : undefined,
    currency: p.prices.currency_code === "INR" ? "INR" : "USD",
    categorySlug: explicitCat?.slug ?? fallbackCategorySlug,
    images: p.images.map((img) => img.src).filter(Boolean),
    sku: p.sku || undefined,
    inventory: 200,
    tags: p.tags.map((t) => t.name),
    seoTitle: decodeEntities(p.name),
    seoDescription: metaDescription(plainDesc),
  };
}

async function fetchCatalog(): Promise<{ categories: CatalogCategory[]; products: CatalogProduct[] }> {
  const wcCategories = await fetchJson<WcCategory[]>(`${WC_BASE}/products/categories?per_page=100`);
  const categories: CatalogCategory[] = wcCategories
    .filter((c) => MAIN_CATEGORY_SLUGS.has(c.slug) && c.count > 0)
    .map((c, i) => ({
      name: decodeEntities(c.name),
      slug: c.slug,
      description: stripHtml(c.description || ""),
      sortOrder: i + 1,
    }));

  const activeSlugs = new Set(categories.map((c) => c.slug));
  const productMap = new Map<string, CatalogProduct>();

  for (const catSlug of CATEGORY_FETCH_ORDER) {
    if (!activeSlugs.has(catSlug)) continue;

    for (let page = 1; page <= 5; page++) {
      const batch = await fetchJson<WcProduct[]>(
        `${WC_BASE}/products?category=${catSlug}&per_page=100&page=${page}`
      );
      if (batch.length === 0) break;

      for (const p of batch) {
        if (productMap.has(p.slug)) continue;
        productMap.set(p.slug, toCatalogProduct(p, catSlug));
      }
    }
  }

  const products = Array.from(productMap.values());
  await enrichProductImages(products);
  return { categories, products };
}

function getDocClient() {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    ...(endpoint
      ? { endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } }
      : {}),
  });
  return DynamoDBDocumentClient.from(client);
}

async function importToDb(catalog: { categories: CatalogCategory[]; products: CatalogProduct[] }) {
  const ENV = process.env.ENVIRONMENT ?? "dev";
  const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
  const CONFIG_TABLE = process.env.CONFIG_TABLE ?? `spicycorner-config-${ENV}`;
  const docClient = getDocClient();
  const timestamp = new Date().toISOString();

  for (const cat of catalog.categories) {
    await docClient.send(
      new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: {
          ...cat,
          published: true,
          PK: categoryKeys.pk(cat.slug),
          SK: categoryKeys.sk(),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );
  }

  for (const p of catalog.products) {
    await docClient.send(
      new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: {
          ...p,
          published: true,
          PK: productKeys.pk(p.slug),
          SK: productKeys.sk(),
          GSI1PK: productKeys.gsi1pk(p.categorySlug),
          GSI1SK: productKeys.gsi1sk(p.slug),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );
  }

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.payments.pk,
        SK: configKeys.payments.sk,
        ...defaultPaymentConfig,
        updatedAt: timestamp,
      },
    })
  );

  console.log(`Imported ${catalog.categories.length} categories, ${catalog.products.length} products → ${PRODUCTS_TABLE}`);
}

async function main() {
  const fetchOnly = process.argv.includes("--fetch-only");
  const refresh = process.argv.includes("--refresh");

  let catalog: Awaited<ReturnType<typeof fetchCatalog>>;

  if (!refresh && existsSync(CATALOG_PATH)) {
    catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
    console.log(`Using cached catalog: ${catalog.products.length} products`);
  } else {
    console.log("Fetching catalog from spicycenter.com...");
    catalog = await fetchCatalog();
    mkdirSync(join(process.cwd(), "scripts/data"), { recursive: true });
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    console.log(`Saved ${CATALOG_PATH} (${catalog.products.length} products)`);
  }

  if (!fetchOnly) {
    await importToDb(catalog);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
