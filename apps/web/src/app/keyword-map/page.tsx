import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { loadKeywordUniverseMeta, searchKeywordUniverse } from "@/lib/keyword-universe";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const meta = pageMetadata({
    title: "Keyword map — 100,000 sourcing phrases",
    description:
      "Search the SpicyCenter keyword universe. Phrases map to market and sourcing hubs. They are generated seeds, not validated search volume.",
    path: "/keyword-map",
  });
  if (q?.trim()) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function KeywordMapPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const meta = loadKeywordUniverseMeta();
  const hits = query.length >= 2 ? await searchKeywordUniverse(query, 40) : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="spice-kicker">SEO planning</p>
      <h1 className="spice-heading text-4xl mt-2">Keyword map</h1>
      <p className="mt-4 text-muted leading-relaxed">
        {meta
          ? `${meta.keywordCount.toLocaleString("en-GB")} phrases from ${meta.source}. ${meta.validation}.`
          : "Keyword universe file is not loaded."}{" "}
        We do not publish a separate URL for each phrase.
      </p>
      <form action="/keyword-map" method="get" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="e.g. turmeric importer UAE"
          className="flex-1 rounded-xl border border-[#e6d5bc] px-3 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-xl bg-nav text-white px-4 py-2.5 text-sm font-semibold">
          Search
        </button>
      </form>
      {query.length >= 2 && (
        <p className="mt-4 text-sm text-muted">
          {hits.length} matches for “{query}”
        </p>
      )}
      <ul className="mt-4 space-y-2">
        {hits.map((h) => (
          <li key={`${h.keyword}-${h.marketSlug}`} className="rounded-xl border border-[#e6d5bc] bg-white p-3 text-sm">
            <p className="text-primary">{h.keyword}</p>
            <p className="text-xs text-muted mt-1">
              {h.intent} · {h.country} ·{" "}
              <Link href={h.url} className="text-nav font-semibold">
                Open market hub
              </Link>
              {" · "}
              <Link href={`/sourcing/${h.productSlug}`} className="text-nav">
                {h.productSlug}
              </Link>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        <Link href="/markets" className="text-nav font-semibold">
          Browse all export markets →
        </Link>
      </p>
    </div>
  );
}
