import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import { getSpiceBySlug } from "@/lib/spice-data";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { spiceHubLinks } from "@/lib/seo/spice-hub-links";
import { WHOLESALE_LANDINGS, WHOLESALE_SLUGS } from "@/lib/content/wholesale-landings";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return WHOLESALE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const landing = WHOLESALE_LANDINGS[slug];
  const spice = getSpiceBySlug(slug);
  const name = spice?.canonicalName ?? landing?.h1 ?? slug.replace(/-/g, " ");
  return pageMetadata({
    title: landing?.title ?? `${name} wholesale`,
    description: landing?.description ?? `Bulk ${name} from 10kg. Request a wholesale quote.`,
    path: `/wholesale/${slug}`,
  });
}

export default async function WholesaleSlugPage({ params }: Props) {
  const { slug } = await params;
  const landing = WHOLESALE_LANDINGS[slug];
  const spice = getSpiceBySlug(slug);
  const name =
    spice?.canonicalName ??
    landing?.h1 ??
    (slug === "indian-spices" ? "Indian spices" : slug.replace(/-/g, " "));
  const productDefault = landing?.product ?? spice?.canonicalName ?? "";
  const groups = spice
    ? spiceHubLinks(spice.slug, spice.canonicalName)
    : spiceHubLinks("cumin", "Cumin");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm text-muted">
        <Link href="/wholesale">Wholesale</Link> / {name}
      </p>
      <h1 className="spice-heading text-4xl mt-2">{landing?.h1 ?? `${name} wholesale`}</h1>
      <p className="mt-3 text-muted leading-relaxed">
        {landing?.intro ??
          "Minimum 10kg. Quote depends on grade, origin, packaging and delivery country. We do not invent a warehouse in every city."}
      </p>
      <p className="mt-3 font-semibold">10kg minimum wholesale order</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link className="text-nav" href="/spices">
          Browse catalogue
        </Link>
        {spice ? (
          <Link className="text-nav" href={`/spice-guide/${spice.slug}`}>
            {spice.canonicalName} guide
          </Link>
        ) : null}
        <Link className="text-nav" href="/uk/indian-spices-wholesale">
          UK wholesale
        </Link>
        <a className="text-nav" href="https://wa.me/919266467887?text=Hi%20SpicyCenter%2C%20wholesale%20quote">
          WhatsApp
        </a>
      </div>
      <h2 className="font-serif text-2xl mt-10 mb-4">Request wholesale quote</h2>
      <WholesaleQuoteForm defaultProduct={productDefault} />
      <InternalLinksSection groups={groups} title="Related buying pages" />
    </div>
  );
}
