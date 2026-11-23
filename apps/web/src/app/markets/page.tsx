import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { loadKeywordMarkets, loadKeywordUniverseMeta } from "@/lib/keyword-universe";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { MARKETS_SUPPLIED_H1, MARKETS_SUPPLIED_INTRO, MARKETS_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";

const MARKETS_META_TITLE = "Indian Spices for International Markets | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: MARKETS_META_TITLE,
    description:
      "Explore Indian spice sourcing for the UK, Europe, the USA, Canada, the UAE, the Middle East and other international markets.",
    path: "/markets",
    absoluteTitle: true,
  }),
  MARKETS_META_TITLE,
);

export default function MarketsIndexPage() {
  const markets = loadKeywordMarkets();
  const meta = loadKeywordUniverseMeta();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Export markets", path: "/markets" }]} />
      <p className="spice-kicker">B2B sourcing</p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">{MARKETS_SUPPLIED_H1}</h1>
      {MARKETS_SUPPLIED_INTRO.map((paragraph) => (
        <p key={paragraph} className="mt-4 text-muted max-w-3xl leading-relaxed">
          {paragraph}
        </p>
      ))}
      <p className="mt-6 rounded-2xl border border-[#e6d5bc] bg-white p-4 text-sm">
        Targeting the UAE and the Middle East? Read the{" "}
        <Link href="/middle-east" className="text-nav font-semibold">
          Middle East market page
        </Link>{" "}
        and use the UAE and GCC market hubs below.
      </p>
      {meta && (
        <p className="mt-3 text-xs text-muted">
          {meta.keywordCount.toLocaleString("en-GB")} keyword seeds mapped to these hubs. {meta.validation}.
        </p>
      )}
      <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
      <SuppliedPageCopy sections={MARKETS_SUPPLIED_SECTIONS} className="mt-12" />
    </div>
  );
}
