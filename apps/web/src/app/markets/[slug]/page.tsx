import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canonical, pageMetadata } from "@/lib/seo";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import {
  bulkDestinationQuery,
  existingCountryHub,
  existingUrlsForProduct,
  getKeywordMarket,
  loadKeywordMarkets,
  loadKeywordProducts,
  marketFulfilment,
  spiceQueryForProduct,
} from "@/lib/keyword-universe";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return loadKeywordMarkets().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const market = getKeywordMarket(slug);
  if (!market) return { title: "Market" };
  const meta = pageMetadata({
    title: `Indian spices for ${market.name} — free sourcing enquiry`,
    description: `Bulk and wholesale Indian spice enquiries for ${market.name}. Standard enquiry is free. Optional add-ons are paid only if you choose them.`,
    path: `/markets/${slug}`,
  });
  const lang = slug === "usa" ? "en-US" : "en-GB";
  return {
    ...meta,
    alternates: {
      canonical: canonical(`/markets/${slug}`),
      languages: {
        [lang]: canonical(`/markets/${slug}`),
        "x-default": canonical("/markets"),
      },
    },
  };
}

function fulfilmentCopy(slug: string, name: string): string {
  const mode = marketFulfilment(slug);
  if (mode === "origin") {
    return `${name} is SpicyCenter’s sourcing origin. This page is for buyers who want Indian spices exported outward — not a domestic India shopfront.`;
  }
  if (mode === "retail_eu") {
    return `Retail packs can be quoted for delivery in ${name} when that country is on the UK/EU storefront list. Wholesale starts at 10kg. 100kg+ cargo uses the bulk enquiry form.`;
  }
  if (mode === "bulk_quote") {
    return `This storefront does not run a retail checkout for ${name}. Importers and distributors can send a free 100kg+ bulk enquiry. We do not charge for the enquiry itself.`;
  }
  return `Retail checkout is not offered to ${name} on this website. You can still send a free sourcing enquiry for Indian spices. We will not invent a local warehouse, MOQ, or transit time on this page.`;
}

export default async function MarketPage({ params }: Props) {
  const { slug } = await params;
  const market = getKeywordMarket(slug);
  if (!market) notFound();
  const products = loadKeywordProducts();
  const dest = bulkDestinationQuery(slug);
  const hub = existingCountryHub(slug);
  const topIntents = Object.entries(market.intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <p className="spice-kicker">
        <Link href="/markets" className="text-nav">
          Export markets
        </Link>{" "}
        · {market.marketCode}
      </p>
      <h1 className="spice-heading text-4xl mt-2">Indian spices for {market.name}</h1>
      <p className="mt-4 text-muted leading-relaxed">{fulfilmentCopy(slug, market.name)}</p>
      <p className="mt-3 text-sm text-muted">{market.recommendedContent}</p>
      <FreeEnquiryCtas productName="Indian spices" spiceQuery="cumin" destination={dest} />
      {hub && (
        <p className="mt-4 text-sm">
          Existing storefront page:{" "}
          <Link href={hub.href} className="text-nav font-semibold">
            {hub.label}
          </Link>
        </p>
      )}

      <h2 className="font-serif text-2xl text-primary mt-10">Product clusters on this hub</h2>
      <p className="text-sm text-muted mt-2">
        {market.keywordCount.toLocaleString("en-GB")} generated keyword seeds point here. They are planning phrases, not
        proven search volume.
      </p>
      <ul className="mt-4 space-y-3">
        {products.map((p) => (
          <li key={p.slug} className="rounded-xl border border-[#e6d5bc] bg-white p-4">
            <div className="flex justify-between gap-3">
              <Link href={`/sourcing/${p.slug}`} className="font-semibold text-primary hover:text-nav">
                {p.name}
              </Link>
              <span className="text-xs text-muted">
                {(market.productCounts[p.slug] ?? 0).toLocaleString("en-GB")} phrases
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {existingUrlsForProduct(p.slug).map((l) => (
                <Link key={l.href} href={l.href} className="text-nav">
                  {l.label}
                </Link>
              ))}
              <Link
                href={`/bulk-enquiry?spice=${spiceQueryForProduct(p.slug)}${dest ? `&destination=${dest}` : ""}`}
                className="text-nav"
              >
                Bulk quote
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">Example mapped phrases</h2>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted space-y-1">
        {market.sampleKeywords.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Buyer intents in this set: {topIntents.map(([i]) => i).join(", ")}.</p>

      <h2 className="font-serif text-2xl text-primary mt-10">Free enquiry</h2>
      <p className="text-sm text-muted mt-2">
        No payment is required to submit. Say the spice, kilograms, and destination. Paid add-ons apply only if you
        select them on a UK/EU 100kg+ quote.
      </p>
      <div className="mt-4">
        <WholesaleQuoteForm defaultProduct="Indian spices" defaultCountry={dest === "US" ? "US" : dest === "CA" ? "CA" : dest === "UK" ? "GB" : ""} />
      </div>
    </div>
  );
}
