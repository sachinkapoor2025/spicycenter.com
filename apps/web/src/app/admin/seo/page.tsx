import Link from "next/link";
import { getSiteUrl } from "@/lib/env";
import { loadKeywordMarkets, loadKeywordUniverseMeta } from "@/lib/keyword-universe";
import { loadSpiceEntities, spiceEditorialStatus } from "@/lib/spice-data";
import { FOOD_FAMILIES } from "@/lib/food-families";
import { SOURCING_GUIDES } from "@/lib/sourcing-guides";

export default function AdminSeoPage() {
  const site = getSiteUrl();
  const spices = loadSpiceEntities();
  const byEditorial = spices.reduce<Record<string, number>>((acc, spice) => {
    const status = spiceEditorialStatus(spice);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const meta = loadKeywordUniverseMeta();
  const markets = loadKeywordMarkets();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SEO ops</h1>
        <p className="text-sm text-slate-600 mt-2">
          Canonical host: <code>{site}</code>. Production builds default to https://www.spicycenter.com.
        </p>
      </div>
      <ul className="text-sm space-y-2 bg-white rounded-xl border p-4">
        <li>
          <Link className="text-nav" href="/sitemap.xml">
            Sitemap
          </Link>
        </li>
        <li>
          <Link className="text-nav" href="/robots.txt">
            robots.txt
          </Link>
        </li>
        <li>
          <Link className="text-nav" href="/keyword-map">
            Public keyword map
          </Link>
        </li>
        <li>
          Keyword seeds: {meta ? meta.keywordCount.toLocaleString("en-GB") : "not loaded"} · market hubs: {markets.length} ·
          food families: {FOOD_FAMILIES.length} · guides: {SOURCING_GUIDES.length}
        </li>
      </ul>
      <section>
        <h2 className="text-lg font-semibold">Spice editorial counts</h2>
        <table className="w-full text-sm mt-3 bg-white rounded-xl border">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Status</th>
              <th className="p-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byEditorial).map(([status, count]) => (
              <tr key={status} className="border-b">
                <td className="p-3">{status}</td>
                <td className="p-3">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
