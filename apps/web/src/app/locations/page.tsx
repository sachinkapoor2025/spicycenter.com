import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { ME_PLACES } from "@/lib/middle-east-locations";
import { loadKeywordMarkets } from "@/lib/keyword-universe";
import { allSeoLocationSlugs } from "@/lib/content/seo-data";
import { allCountrySeoSlugs } from "@/lib/content/country-pages";

export const metadata: Metadata = pageMetadata({
  title: "Location pages we publish — countries, emirates and cities",
  description:
    "Honest inventory of SpicyCenter country, state and city pages. Middle East is expanded. We do not publish a thin page for every city on earth.",
  path: "/locations",
});

export default function LocationsInventoryPage() {
  const markets = loadKeywordMarkets();
  const usCities = allSeoLocationSlugs();
  const countrySeo = allCountrySeoSlugs();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Locations", path: "/locations" }]} />
      <h1 className="spice-heading text-4xl">Location coverage</h1>
      <p className="mt-4 text-muted leading-relaxed">
        A separate URL for every city, state and country worldwide would be a doorway farm. Keyword-file governance
        forbids that. We publish unique hubs. Middle East is the set we expanded with emirates and commercial cities.
      </p>

      <h2 className="font-serif text-2xl text-primary mt-10">
        Middle East — {ME_PLACES.length} country / emirate / city pages
      </h2>
      <ul className="mt-3 text-sm space-y-1">
        {ME_PLACES.map((p) => (
          <li key={p.slug}>
            <Link href={`/middle-east/${p.slug}`} className="text-nav">
              /middle-east/{p.slug}
            </Link>
            <span className="text-muted">
              {" "}
              — {p.name} ({p.kind})
            </span>
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">
        Keyword-market countries — {markets.length} hubs
      </h2>
      <p className="text-sm text-muted mt-2">One page per country in the 100k workbook. Not one page per keyword.</p>
      <ul className="mt-3 grid sm:grid-cols-2 gap-1 text-sm">
        {markets.map((m) => (
          <li key={m.slug}>
            <Link href={`/markets/${m.slug}`} className="text-nav">
              {m.name}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">
        Legacy retail country pages — {countrySeo.length}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {countrySeo.map((slug) => (
          <li key={slug}>
            <Link href={`/countries/${slug}`} className="text-nav">
              /countries/{slug}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="font-serif text-2xl text-primary mt-10">United States /cities pages</h2>
      <p className="text-sm text-muted mt-2">
        {usCities.length === 0
          ? "None published. The old US city doorway list is empty on purpose so we do not recreate thin /cities URLs."
          : `${usCities.length} city/state slugs.`}
      </p>
    </div>
  );
}
