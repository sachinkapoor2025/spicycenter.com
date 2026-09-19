import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { pageMetadata } from "@/lib/seo";
import { ME_PLACES, mePlacesByKind } from "@/lib/middle-east-locations";

export const metadata: Metadata = pageMetadata({
  title: "Middle East Indian spice sourcing — UAE, GCC and nearby markets",
  description:
    "Country, emirate and city enquiry hubs for UAE and the wider Middle East. Standard enquiry is free. We do not invent warehouses or certificates.",
  path: "/middle-east",
});

export default function MiddleEastIndexPage() {
  const countries = mePlacesByKind("country");
  const states = mePlacesByKind("state");
  const cities = mePlacesByKind("city");
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Middle East", path: "/middle-east" }]} />
      <p className="spice-kicker">UAE · GCC · Levant · North Africa</p>
      <h1 className="spice-heading text-4xl mt-2">Middle East spice sourcing</h1>
      <p className="mt-4 text-muted leading-relaxed">
        These {ME_PLACES.length} pages cover the Middle East markets we will actively rank for: every GCC country, the
        seven UAE emirates, and the commercial cities buyers name on enquiries. They map the 100k keyword workbook
        (7 products × country intents) onto hubs — not a thin page per generated phrase. Other world countries stay on{" "}
        <Link href="/markets" className="text-nav font-semibold">
          /markets
        </Link>{" "}
        only.
      </p>
      <FreeEnquiryCtas productName="Indian spices" />

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-primary">Countries</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          {countries.map((p) => (
            <li key={p.slug}>
              <Link href={`/middle-east/${p.slug}`} className="text-nav font-semibold">
                {p.name}
              </Link>
              {" · "}
              <Link href={`/markets/${p.marketSlug}`} className="text-muted">
                keyword hub
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-primary">UAE emirates (states)</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          {states.map((p) => (
            <li key={p.slug}>
              <Link href={`/middle-east/${p.slug}`} className="text-nav font-semibold">
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-primary">Cities</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          {cities.map((p) => (
            <li key={p.slug}>
              <Link href={`/middle-east/${p.slug}`} className="text-nav font-semibold">
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
