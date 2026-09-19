import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import {
  existingUrlsForProduct,
  getKeywordProduct,
  loadKeywordMarkets,
  loadKeywordProducts,
  spiceQueryForProduct,
} from "@/lib/keyword-universe";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return loadKeywordProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getKeywordProduct(slug);
  if (!product) return { title: "Sourcing" };
  return pageMetadata({
    title: `${product.name} bulk sourcing from India — free enquiry`,
    description: `B2B sourcing notes for ${product.name}. Enquiries are free. Catalog SKUs on this site are Indian spices — we do not invent rice, pulse or dry-fruit stock here.`,
    path: `/sourcing/${slug}`,
  });
}

export default async function SourcingPage({ params }: Props) {
  const { slug } = await params;
  const product = getKeywordProduct(slug);
  if (!product) notFound();
  const markets = loadKeywordMarkets()
    .filter((m) => (product.countryCounts[m.slug] ?? 0) > 0)
    .sort((a, b) => (product.countryCounts[b.slug] ?? 0) - (product.countryCounts[a.slug] ?? 0));
  const links = existingUrlsForProduct(slug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <p className="spice-kicker">
        <Link href="/markets" className="text-nav">
          Markets
        </Link>{" "}
        · sourcing
      </p>
      <h1 className="spice-heading text-4xl mt-2">{product.name} — bulk sourcing</h1>
      <p className="mt-4 text-muted leading-relaxed">
        This profile maps {product.keywordCount.toLocaleString("en-GB")} generated keyword seeds to existing spice pages
        and a free enquiry. Origin, grade, packaging and MOQ are confirmed on the quote — not invented in this copy.
      </p>
      <ul className="mt-4 flex flex-wrap gap-3 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-nav font-semibold">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <FreeEnquiryCtas productName={product.name} spiceQuery={spiceQueryForProduct(slug)} />

      <h2 className="font-serif text-2xl text-primary mt-10">What buyers ask for</h2>
      <p className="text-sm text-muted mt-2">
        {Object.keys(product.intentCounts).join(", ")}. Those are intent labels from the keyword workbook, not a promise
        that we offer every service in every country.
      </p>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted space-y-1">
        {product.sampleKeywords.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">Markets mapped to this product</h2>
      <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
        {markets.map((m) => (
          <li key={m.slug}>
            <Link href={`/markets/${m.slug}`} className="text-nav">
              {m.name}
            </Link>
            <span className="text-muted"> · {(product.countryCounts[m.slug] ?? 0).toLocaleString("en-GB")}</span>
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">Free enquiry</h2>
      <WholesaleQuoteForm defaultProduct={product.name} />
    </div>
  );
}
