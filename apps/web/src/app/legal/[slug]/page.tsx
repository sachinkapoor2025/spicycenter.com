import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";

const PAGES = {
  "food-information": {
    title: "Food information",
    body: "UK and EU prepacked food rules require name, ingredients (if more than one), allergens, net quantity, origin where required, storage, lot/batch, and the responsible food business / importer. Online EU sales generally need this information available before the purchase is concluded. Product records include these fields; they must be completed before a live offer.",
  },
  allergens: {
    title: "Allergens",
    body: "Mustard, sesame, celery and nuts can appear in spices and blends. Allergen statements are lot-specific and must be verified — this site does not invent allergen-free claims.",
  },
  shipping: {
    title: "Shipping",
    body: "UK default: ₹750 per kg, 1kg minimum, configurable in admin. Product price, shipping, VAT and customs duty are separate line items. We do not state that shipping includes import costs unless that is actually configured.",
  },
  returns: {
    title: "Returns",
    body: "Unopened food returns follow the published returns policy once live sale begins. Opened food is generally not restocked for hygiene reasons.",
  },
  privacy: {
    title: "Privacy",
    body: "Customer, wholesale and analytics data are processed to fulfil orders and improve the shop. Analytics IDs belong in environment variables, not source.",
  },
  terms: {
    title: "Terms",
    body: "Retail checkout and wholesale quotes are different contracts. Bulk pricing can change with grade, crop and market. Indicative Indian market prices are not offers.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug as keyof typeof PAGES];
  if (!page) return {};
  return pageMetadata({ title: page.title, description: page.body.slice(0, 150), path: `/legal/${slug}` });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug as keyof typeof PAGES];
  if (!page) notFound();
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-4xl">{page.title}</h1>
      <p className="mt-4 leading-relaxed">{page.body}</p>
    </article>
  );
}
