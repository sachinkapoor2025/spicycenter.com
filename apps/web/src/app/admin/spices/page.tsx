import { loadSpiceEntities, loadMarketPrices } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";

export default function AdminSpicesPage() {
  const spices = loadSpiceEntities();
  const products = getCatalogProducts();
  const prices = loadMarketPrices();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Spices</h1>
      <p className="text-sm text-slate-600 mt-2">{spices.length} entities · {products.length} SKUs · {prices.length} market rows (empty until imported)</p>
      <div className="overflow-x-auto mt-6 bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Botanical</th>
              <th className="p-3">Status</th>
              <th className="p-3">Verification</th>
            </tr>
          </thead>
          <tbody>
            {spices.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-3">{s.canonicalName}</td>
                <td className="p-3">{s.botanicalName}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3">{s.verificationStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
