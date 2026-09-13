import { getApiUrl, getSiteUrl, getCdnUrl } from "@/lib/env";
import { CJ_STOREFRONT_PRODUCTS_PATH } from "@spicycorner/shared";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { stripHtml } from "@/lib/html-text";

type FeedProduct = {
  slug: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  images?: string[];
  sku?: string;
  inventory?: number;
  categorySlug?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function productImage(p: FeedProduct): string {
  const raw = p.images?.[0];
  if (!raw) return `${getSiteUrl()}/logo.png`;
  if (raw.startsWith("http")) return raw;
  return `${getCdnUrl()}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export async function GET() {
  const site = getSiteUrl();
  let products: FeedProduct[] = [];

  try {
    const res = await fetch(`${getApiUrl()}${CJ_STOREFRONT_PRODUCTS_PATH}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as { products: FeedProduct[] };
      products = data.products ?? [];
    }
  } catch {
    products = [];
  }

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  for (const p of getCatalogProducts()) {
    if (!bySlug.has(p.slug)) {
      bySlug.set(p.slug, {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        images: p.images,
        sku: p.sku,
        inventory: p.inventory,
        categorySlug: p.categorySlug,
      });
    }
  }
  products = [...bySlug.values()];

  const items = products
    .map((p) => {
      const currency = p.currency === "INR" ? "INR" : "USD";
      const price = p.price.toFixed(2);
      const availability = (p.inventory ?? 1) > 0 ? "in stock" : "out of stock";
      const description = stripHtml(p.description ?? p.name).slice(0, 5000);
      return `<item>
  <g:id>${escapeXml(p.sku ?? p.slug)}</g:id>
  <g:title>${escapeXml(p.name)}</g:title>
  <g:description>${escapeXml(description)}</g:description>
  <g:link>${escapeXml(`${site}/products/${p.slug}`)}</g:link>
  <g:image_link>${escapeXml(productImage(p))}</g:image_link>
  <g:price>${price} ${currency}</g:price>
  <g:availability>${availability}</g:availability>
  <g:condition>new</g:condition>
  <g:brand>SpicyCorner</g:brand>
  <g:google_product_category>632</g:google_product_category>
  <g:shipping>
    <g:country>US</g:country>
    <g:service>Standard</g:service>
    <g:price>0.00 USD</g:price>
  </g:shipping>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>SpicyCorner — spice Decorations, Spices & Spice packs</title>
<link>${escapeXml(site)}</link>
<description>Indian spices, spices, and spice packs. International shipping — delivering in 5–7 days.</description>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export const runtime = "nodejs";
