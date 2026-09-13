import { exploreCategories } from "@/lib/site";

export interface CategoryRichContent {
  slug: string;
  headline: string;
  intro: string[];
  delivery: { heading: string; paragraphs: string[] };
  highlights: { heading: string; items: string[] };
  tradition?: { heading: string; paragraphs: string[] };
  whyUs: { heading: string; bullets: string[] };
  howTo: { heading: string; steps: string[] };
  faqs: { q: string; a: string }[];
  relatedCategories: { label: string; href: string; text: string }[];
}

function relatedExcept(slug: string) {
  return exploreCategories
    .filter((c) => c.slug !== slug)
    .slice(0, 4)
    .map((c) => ({ label: c.name, href: c.href, text: `Shop ${c.name.toLowerCase()}.` }));
}

export const categoryRichContent: Record<string, CategoryRichContent> = Object.fromEntries(
  exploreCategories.map((c) => [
    c.slug,
    {
      slug: c.slug,
      headline: c.name,
      intro: [`${c.name} from Indian growing regions, in retail packs and 10kg+ bulk.`],
      delivery: {
        heading: "Shipping",
        paragraphs: ["UK shipping is configurable per kg. Duty and VAT are listed separately unless included."],
      },
      highlights: { heading: "In this collection", items: ["Named varieties", "Retail and bulk packs", "Grade fields when they apply"] },
      whyUs: { heading: "Buying notes", bullets: ["Not a medical product", "Market prices are indicative"] },
      howTo: { heading: "How to choose", steps: ["Pick the spice", "Pick form", "Pick pack", "Read origin and allergens"] },
      faqs: [{ q: "Can I buy bulk?", a: "Yes, from 10kg." }],
      relatedCategories: relatedExcept(c.slug),
    } satisfies CategoryRichContent,
  ])
);

export function getCategoryRichContent(slug: string): CategoryRichContent | undefined {
  return categoryRichContent[slug];
}
