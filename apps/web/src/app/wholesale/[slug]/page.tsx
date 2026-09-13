import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import { getSpiceBySlug } from "@/lib/spice-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const spice = getSpiceBySlug(slug);
  const name = spice?.canonicalName ?? slug.replace(/-/g, " ");
  return pageMetadata({
    title: `${name} wholesale`,
    description: `Bulk ${name} from 10kg. Request a wholesale quote.`,
    path: `/wholesale/${slug}`,
  });
}

export default async function WholesaleSlugPage({ params }: Props) {
  const { slug } = await params;
  const spice = getSpiceBySlug(slug);
  const name = spice?.canonicalName ?? (slug === "indian-spices" ? "Indian spices" : slug.replace(/-/g, " "));
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">{name} wholesale</h1>
      <p className="mt-3 text-muted">Minimum 10kg. Quote depends on grade, origin, packaging and delivery country.</p>
      <div className="mt-8">
        <WholesaleQuoteForm defaultProduct={name} />
      </div>
    </div>
  );
}
