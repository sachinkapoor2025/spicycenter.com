import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { pageMetadata } from "@/lib/seo";
import { loadMarketPrices, loadSpiceEntities } from "@/lib/spice-data";

export const metadata: Metadata = pageMetadata({
  title: "Indicative Indian spice market prices",
  description: "Dated, sourced Indian market reference prices by spice, market and grade. Not your SpicyCorner checkout price.",
  path: "/spice-market-prices",
});

export default function MarketPricesPage() {
  const prices = loadMarketPrices();
  const spices = loadSpiceEntities();
  const ratesPath = ["data/shipping-rates.json", "../../data/shipping-rates.json"]
    .map((p) => join(process.cwd(), p))
    .find((p) => existsSync(p));
  const shipping = ratesPath ? JSON.parse(readFileSync(ratesPath, "utf-8")) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spice market prices</h1>
      <p className="mt-4 text-muted max-w-2xl">
        Indicative Indian market prices. They are not the exact purchase cost. Values vary by origin, quality, grade, market and season.
        We do not scrape third-party sites. Admin imports CSV or enters prints with source URL and date. Historical rows are never overwritten.
      </p>
      <div className="overflow-x-auto mt-8 card-spice">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              {["Spice", "Market", "Grade", "Avg", "Min", "Max", "Date", "Source"].map((h) => (
                <th key={h} className="p-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={`${p.spiceId}-${p.market}-${p.grade}`} className="border-b border-[#eadfce]">
                <td className="p-3">
                  <Link className="text-nav" href={`/spice-guide/${p.spiceId}`}>
                    {spices.find((s) => s.id === p.spiceId)?.canonicalName ?? p.spiceId}
                  </Link>
                </td>
                <td className="p-3">{p.market}</td>
                <td className="p-3">{p.grade}</td>
                <td className="p-3">{p.averagePrice ?? "—"}</td>
                <td className="p-3">{p.minPrice ?? "—"}</td>
                <td className="p-3">{p.maxPrice ?? "—"}</td>
                <td className="p-3">{p.priceDate}</td>
                <td className="p-3 text-xs text-muted">{p.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shipping && <p className="mt-6 text-xs text-muted">{shipping.notes}</p>}
    </div>
  );
}
