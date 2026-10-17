import type { Metadata } from "next";
import Link from "next/link";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import { getSpiceBySlug } from "@/lib/spice-data";
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <HubBreadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Wholesale", path: "/wholesale" },
          { name, path: `/wholesale/${slug}` },
        ]}
      />
      <h1 className="spice-heading text-4xl mt-2">{landing?.h1 ?? `${name} wholesale`}</h1>
      <p className="mt-3 text-muted leading-relaxed">
        {landing?.intro ??
          "Minimum 10kg. Quote depends on grade, origin, packaging and delivery country. We do not invent a warehouse in every city."}{" "}
        See the{" "}
        <Link href="/spices" className="text-nav font-semibold hover:underline">
          Indian spice catalogue
        </Link>
        {spice ? (
          <>
            , the{" "}
            <Link href={`/spice-guide/${spice.slug}`} className="text-nav font-semibold hover:underline">
              {spice.canonicalName} spice guide
            </Link>
          </>
        ) : (
          <>
            , the{" "}
            <Link href="/spice-guide" className="text-nav font-semibold hover:underline">
              spice guide
            </Link>
          </>
        )}
        , and{" "}
        <Link href="/uk" className="text-nav font-semibold hover:underline">
          Indian spices UK
        </Link>
        .
      </p>
      <p className="mt-3 font-semibold">10kg minimum wholesale order</p>
      <FreeEnquiryCtas productName={productDefault || name} spiceQuery={spice?.slug} />
      <h2 className="font-serif text-2xl mt-10 mb-4">Request wholesale quote</h2>
      <WholesaleQuoteForm defaultProduct={productDefault} />
    </div>
  );
}
