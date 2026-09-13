import { loadMarketPrices, loadSpiceEntities } from "@/lib/spice-data";

export default function AdminPricesPage() {
  const prices = loadMarketPrices();
  const spices = loadSpiceEntities();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Market prices</h1>
      <p className="text-sm text-slate-600 mt-2">
        Import CSV or enter manually. Never overwrite history. Do not scrape. Empty averages are intentional.
      </p>
      <table className="w-full text-sm mt-6 bg-white rounded-xl border">
        <thead>
          <tr className="text-left border-b">
            <th className="p-3">Spice</th>
            <th className="p-3">Market</th>
            <th className="p-3">Grade</th>
            <th className="p-3">Date</th>
            <th className="p-3">Avg</th>
            <th className="p-3">Source</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p) => (
            <tr key={`${p.spiceId}-${p.market}`} className="border-b">
              <td className="p-3">{spices.find((s) => s.id === p.spiceId)?.canonicalName}</td>
              <td className="p-3">{p.market}</td>
              <td className="p-3">{p.grade}</td>
              <td className="p-3">{p.priceDate}</td>
              <td className="p-3">{p.averagePrice ?? "pending"}</td>
              <td className="p-3 text-xs">{p.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
