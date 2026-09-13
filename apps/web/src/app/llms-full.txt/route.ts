import { site, navItems, faqs } from "@/lib/site";
import { siteUrl } from "@/lib/env";
import { loadStorefrontProducts } from "@/lib/product-loader";
import { blogPosts } from "@/lib/content/blog-posts";
import { seoLocations, seoBlogEntries, seoEventsHub } from "@/lib/content/seo-data";

/**
 * llms-full.txt — detailed product catalog for AI assistants (GEO).
 * Extends /llms.txt with per-product name, price, category, description.
 */
export async function GET() {
  const products = await loadStorefrontProducts();

  const categories = navItems
    .filter((n): n is typeof n & { category: string } => "category" in n)
    .map((n) => `- ${n.label}: ${siteUrl}/categories/${n.category}`)
    .join("\n");

  const cities = seoLocations
    .map((c) => `- ${c.label}, USA: ${siteUrl}/cities/${c.slug}`)
    .join("\n");

  const seenBlog = new Set<string>();
  const blogLines: string[] = [];
  for (const p of blogPosts) {
    if (seenBlog.has(p.slug)) continue;
    seenBlog.add(p.slug);
    blogLines.push(`- ${p.title}: ${siteUrl}/blog/${p.slug}`);
  }
  for (const p of seoBlogEntries) {
    if (seenBlog.has(p.slug)) continue;
    seenBlog.add(p.slug);
    blogLines.push(`- ${p.title}: ${siteUrl}/blog/${p.slug}`);
  }

  const productLines = products
    .map((p) => {
      const desc = p.description.replace(/\s+/g, " ").slice(0, 200);
      const tags = p.tags?.length ? ` | Tags: ${p.tags.join(", ")}` : "";
      return `- **${p.name}** | ${p.currency} ${p.price} | ${p.categorySlug} | ${siteUrl}/products/${p.slug}\n  ${desc}${tags}`;
    })
    .join("\n\n");

  const faqList = faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  const body = `# ${site.name} — Full Product Catalog (llms-full.txt)
> Extended machine-readable catalog for AI shopping assistants.
> Summary file: ${siteUrl}/llms.txt

${site.description}

**Website:** ${siteUrl}
**Catalog:** Indian spices — retail and 10kg+ wholesale.
**Delivery:** Confirm shipping on each product page. UK rates are per kilogram when configured.
**Payments:** Stripe (USD), Razorpay (INR). Display prices may show in local currency.

---

## Categories

${categories}

---

## City & state delivery pages (USA)

${cities}

---

## Blog articles

${blogLines.join("\n")}

---

## spice events hub

- **Events guide (informational — no tickets sold):** ${siteUrl}${seoEventsHub.hubPath}
  ${seoEventsHub.disclaimer}

---

## All products (${products.length})

${productLines || "Product catalog temporarily unavailable."}

---

## FAQs

${faqList}

---

## Contact

Email: ${site.supportEmail} | WhatsApp: https://wa.me/${site.whatsapp}
Press: ${siteUrl}/press
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "all",
    },
  });
}
