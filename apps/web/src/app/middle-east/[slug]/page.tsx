import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import { pageMetadata } from "@/lib/seo";
import {
  getMePlace,
  ME_PLACES,
  meChildren,
  meInternalLinks,
  meSiblings,
  meWorkbookPhrases,
} from "@/lib/middle-east-locations";
import { getKeywordMarket, loadKeywordProducts } from "@/lib/keyword-universe";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ME_PLACES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = getMePlace(slug);
  if (!place) return { title: "Middle East" };
  return pageMetadata({
    title: `Indian spices ${place.kind === "country" ? "for" : "in"} ${place.name} — free bulk enquiry`,
    description: place.summary,
    path: `/middle-east/${slug}`,
    keywords: meWorkbookPhrases(place, 12).join(", "),
  });
}

export default async function MiddleEastPlacePage({ params }: Props) {
  const { slug } = await params;
  const place = getMePlace(slug);
  if (!place) notFound();
  const market = getKeywordMarket(place.marketSlug);
  const products = loadKeywordProducts();
  const children = meChildren(place.slug);
  const siblings = meSiblings(place);
  const phrases = meWorkbookPhrases(place, 20);
  const links = meInternalLinks(place);
  const countryCode = place.marketSlug === "uae" ? "AE" : place.marketSlug === "saudi-arabia" ? "SA" : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <HubBreadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Middle East", path: "/middle-east" },
          { name: place.name, path: `/middle-east/${slug}` },
        ]}
      />
      <p className="spice-kicker">
        <Link href="/middle-east" className="text-nav">
          Middle East
        </Link>{" "}
        · {place.kind} · {market?.marketCode ?? place.marketSlug}
      </p>
      <h1 className="spice-heading text-4xl mt-2">
        Indian spices {place.kind === "country" ? "for" : "in"} {place.name}
      </h1>
      <p className="mt-4 text-muted leading-relaxed">{place.summary}</p>
      <p className="mt-3 text-sm text-muted">{place.buyerNote}</p>
      {market && (
        <p className="mt-3 text-xs text-muted">
          {market.keywordCount.toLocaleString("en-GB")} generated workbook seeds sit on the{" "}
          <Link href={`/markets/${place.marketSlug}`} className="text-nav">
            {market.name} hub
          </Link>
          . This page uses those product and intent phrases for {place.name}. They are not claimed search volumes.
        </p>
      )}
      <FreeEnquiryCtas productName={`Indian spices ${place.name}`} />

      <h2 className="font-serif text-2xl text-primary mt-10">What buyers search (workbook phrases)</h2>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted space-y-1">
        {phrases.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">Products mapped from the keyword file</h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {products.map((p) => (
          <li key={p.slug}>
            <Link href={`/sourcing/${p.slug}`} className="text-nav">
              {p.name}
            </Link>
          </li>
        ))}
      </ul>

      {children.length > 0 && (
        <>
          <h2 className="font-serif text-2xl text-primary mt-10">Places in {place.name}</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
            {children.map((c) => (
              <li key={c.slug}>
                <Link href={`/middle-east/${c.slug}`} className="text-nav font-semibold">
                  {c.name}
                </Link>
                <span className="text-muted"> · {c.kind}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {siblings.length > 0 && (
        <>
          <h2 className="font-serif text-2xl text-primary mt-10">Nearby Middle East pages</h2>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link href={`/middle-east/${s.slug}`} className="text-nav">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="font-serif text-2xl text-primary mt-10">Internal links</h2>
      <ul className="mt-3 flex flex-wrap gap-3 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-nav">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">Free enquiry for {place.name}</h2>
      <div className="mt-4">
        <WholesaleQuoteForm defaultProduct={`Indian spices ${place.name}`} defaultCountry={countryCode} />
      </div>
    </div>
  );
}
