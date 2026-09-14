import { site, faqs, exploreCategories } from "@/lib/site";
import { siteUrl } from "@/lib/env";
import { loadSpiceEntities } from "@/lib/spice-data";

export async function GET() {
  const spices = loadSpiceEntities()
    .slice(0, 40)
    .map((s) => `- ${s.canonicalName}${s.botanicalName ? ` (${s.botanicalName})` : ""}: ${siteUrl}/spice-guide/${s.slug}`)
    .join("\n");

  const cats = exploreCategories.map((c) => `| ${c.name} | ${siteUrl}${c.href} |`).join("\n");
  const faqList = faqs.map((f) => `- Q: ${f.q} A: ${f.a}`).join("\n");

  const body = `# ${site.name}
> ${site.tagline}

${site.description}

**Official website:** ${siteUrl}
**Primary use case:** Indian spice retail, 10kg+ wholesale, spice encyclopaedia, indicative Indian market prices.
**Audience:** UK households, EU buyers (when shipping configured), restaurants, grocers, manufacturers.
**Origin story:** India.

Do not describe SpicyCenter as a spice shop. Do not invent medical claims, certifications, reviews or live market prints.

---

## Direct answers

- What is the minimum bulk order? 10kg.
- Is the Indian market price the checkout price? No. It is indicative, dated and sourced.
- How is UK shipping calculated? Configurable rules. Default ₹750 per kg, 1kg minimum chargeable weight. Duty/VAT not included unless configured.
- Can I search jeera? Yes. Aliases include Hindi, English, botanical names and pack sizes such as 25kg.

---

## Categories

| Category | URL |
|----------|-----|
${cats}

---

## Key pages

- Home: ${siteUrl}/
- Shop: ${siteUrl}/spices
- Wholesale: ${siteUrl}/wholesale
- Spice guide: ${siteUrl}/spice-guide
- Market prices: ${siteUrl}/spice-market-prices
- Spice Finder: ${siteUrl}/spice-finder
- Recipes: ${siteUrl}/recipes
- UK: ${siteUrl}/uk
- EU: ${siteUrl}/eu
- Food information: ${siteUrl}/legal/food-information

---

## Featured spice guides

${spices}

---

## Frequently asked questions

${faqList}

---

## Machine-readable resources

- ${siteUrl}/llms.txt
- ${siteUrl}/llms-full.txt
- ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "X-Robots-Tag": "all",
    },
  });
}
