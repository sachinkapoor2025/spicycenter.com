import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
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
import { isMeMarketSlug, mePlacesForMarket } from "@/lib/middle-east-locations";

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
  const mePlaces = isMeMarketSlug(slug) ? mePlacesForMarket(slug) : [];
  const countryNote = mePlaces.find((place) => place.kind === "country");
  const placeNames = mePlaces.filter((place) => place.kind !== "country").map((place) => place.name);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <HubBreadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Export markets", path: "/markets" },
          { name: market.name, path: `/markets/${slug}` },
        ]}
      />
      <p className="spice-kicker">
        <Link href="/markets" className="text-nav">
          Export markets
        </Link>{" "}
        · {market.marketCode}
      </p>
      <h1 className="spice-heading text-4xl mt-2">Indian spices for {market.name}</h1>
      {slug === "usa" ? (
        <div className="mt-4 space-y-4 text-muted leading-relaxed">
          <p>
            SpicyCenter helps importers, distributors, restaurants and food manufacturers in the United States source
            Indian spices. This page is a sourcing guide. It is not a United States warehouse or a retail checkout.
          </p>
          <p>
            Tell us the spice, the quantity and the delivery destination. We reply with availability. Shipping cost,
            documents and timing are confirmed in that reply. We do not promise a delivery date here.
          </p>
          <p>Buyers usually ask about these groups:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <Link href="/spices/whole-spices" className="text-nav font-semibold">
                Whole spices
              </Link>{" "}
              such as cumin, coriander, cardamom, clove and black pepper.
            </li>
            <li>
              <Link href="/spices/ground-spices" className="text-nav font-semibold">
                Ground spices
              </Link>{" "}
              such as turmeric, chilli and cumin powder.
            </li>
            <li>
              <Link href="/spices/indian-masalas" className="text-nav font-semibold">
                Masala blends
              </Link>{" "}
              such as garam masala and biryani masala.
            </li>
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-muted leading-relaxed">{fulfilmentCopy(slug, market.name)}</p>
      )}
      {countryNote ? <p className="mt-3 text-muted leading-relaxed">{countryNote.summary}</p> : null}
      {placeNames.length > 0 ? (
        <p className="mt-3 text-sm text-muted leading-relaxed">Places covered: {placeNames.join(", ")}.</p>
      ) : null}
      <FreeEnquiryCtas productName="Indian spices" spiceQuery="cumin" destination={dest} />
      {hub && (
        <p className="mt-4 text-sm">
          <Link href={hub.href} className="text-nav font-semibold">
            {hub.label}
          </Link>
        </p>
      )}

      {slug === "usa" ? null : (
      <>
      <h2 className="font-serif text-2xl text-primary mt-10">Spices for this market</h2>
      <ul className="mt-4 space-y-3">
        {products.map((p) => (
          <li key={p.slug} className="rounded-xl border border-[#e6d5bc] bg-white p-4">
            <Link href={`/sourcing/${p.slug}`} className="font-semibold text-primary hover:text-nav">
              {p.name}
            </Link>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {existingUrlsForProduct(p.slug).map((l) => (
                <Link key={`${p.slug}-${l.label}`} href={l.href} className="text-nav">
                  {l.label}
                </Link>
              ))}
              <Link
                href={`/enquiry?product=${encodeURIComponent(spiceQueryForProduct(p.slug))}${
                  dest ? `&country=${dest === "UK" ? "GB" : dest}` : ""
                }`}
                className="text-nav"
              >
                Enquire
              </Link>
            </div>
          </li>
        ))}
      </ul>
      </>
      )}

      <h2 className="font-serif text-2xl text-primary mt-10">Enquire Now</h2>
      <p className="text-sm text-muted mt-2">
        {slug === "usa"
          ? "No payment is required to submit. Tell us the spice, the quantity in kilograms, and the United States destination."
          : "No payment is required to submit. Say the spice, kilograms, and destination. Paid add-ons apply only if you select them on a UK/EU 100kg+ quote."}
      </p>
      <div className="mt-4">
        <WholesaleQuoteForm defaultProduct="Indian spices" defaultCountry={dest === "US" ? "US" : dest === "CA" ? "CA" : dest === "UK" ? "GB" : ""} />
      </div>
    </div>
  );
}
