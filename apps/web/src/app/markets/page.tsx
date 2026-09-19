import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { loadKeywordMarkets, loadKeywordUniverseMeta } from "@/lib/keyword-universe";

export const metadata: Metadata = pageMetadata({
  title: "Export markets — Indian spice sourcing enquiries",
  description:
    "Country hubs for importers and wholesalers seeking Indian spices. Standard enquiries are free. Keywords are mapped here — we do not publish a page per search phrase.",
  path: "/markets",
});

export default function MarketsIndexPage() {
  const markets = loadKeywordMarkets();
  const meta = loadKeywordUniverseMeta();
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Export markets", path: "/markets" }]} />
      <p className="spice-kicker">B2B sourcing</p>
      <h1 className="spice-heading text-4xl mt-2">Export markets</h1>
      <p className="mt-4 text-muted max-w-3xl leading-relaxed">
        These hubs help buyers in {markets.length} countries find the right enquiry path. Retail checkout on this site is
        quoted for the United Kingdom and listed EU countries. United States and Canada can request a 100kg+ bulk quote.
        Other markets submit a free sourcing enquiry — we do not invent warehouses, certifications, or shipping times.
      </p>
      <p className="mt-6 rounded-2xl border border-[#e6d5bc] bg-white p-4 text-sm">
        Targeting UAE and the Middle East? Use the{" "}
        <Link href="/middle-east" className="text-nav font-semibold">
          Middle East country, emirate and city pages
        </Link>{" "}
        plus the UAE / GCC market hubs below. Other countries on this list are unchanged.
      </p>
      {meta && (
        <p className="mt-3 text-xs text-muted">
          {meta.keywordCount.toLocaleString("en-GB")} keyword seeds mapped to these hubs. {meta.validation}.{" "}
          <Link href="/keyword-map" className="text-nav font-semibold">
            Search the keyword map
          </Link>
        </p>
      )}
      <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {markets.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/markets/${m.slug}`}
              className="block rounded-2xl border border-[#e6d5bc] bg-white p-4 hover:border-nav"
            >
              <p className="font-serif text-lg text-primary">{m.name}</p>
              <p className="text-xs text-muted mt-1">
                {m.marketCode} · {m.keywordCount.toLocaleString("en-GB")} mapped phrases
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
