import Link from "next/link";
import { loadKeywordMarkets, loadKeywordProducts, loadKeywordUniverseMeta } from "@/lib/keyword-universe";

export default function AdminKeywordsPage() {
  const meta = loadKeywordUniverseMeta();
  const markets = loadKeywordMarkets();
  const products = loadKeywordProducts();
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Keyword map</h1>
        <p className="text-sm text-slate-600 mt-2">
          {meta
            ? `${meta.keywordCount.toLocaleString("en-GB")} generated seeds from ${meta.source}. ${meta.validation}`
            : "Keyword universe files are not on this host."}{" "}
          Public search:{" "}
          <Link href="/keyword-map" className="text-nav">
            /keyword-map
          </Link>
        </p>
      </div>
      <section>
        <h2 className="text-lg font-semibold">Countries / hubs</h2>
        <div className="overflow-x-auto mt-3 bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Market</th>
                <th className="p-3">Code</th>
                <th className="p-3">Keywords</th>
                <th className="p-3">Hub</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.slug} className="border-b">
                  <td className="p-3">{m.name}</td>
                  <td className="p-3">{m.marketCode}</td>
                  <td className="p-3">{m.keywordCount}</td>
                  <td className="p-3">
                    <Link href={`/markets/${m.slug}`} className="text-nav">
                      /markets/{m.slug}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Workbook products</h2>
        <div className="overflow-x-auto mt-3 bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Product</th>
                <th className="p-3">Keywords</th>
                <th className="p-3">Sourcing page</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.slug} className="border-b">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.keywordCount}</td>
                  <td className="p-3">
                    <Link href={`/sourcing/${p.slug}`} className="text-nav">
                      /sourcing/{p.slug}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
