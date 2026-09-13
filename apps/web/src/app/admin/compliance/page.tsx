import { loadSpiceEntities } from "@/lib/spice-data";

export default function AdminCompliancePage() {
  const spices = loadSpiceEntities().slice(0, 40);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Import compliance</h1>
      <p className="text-sm text-slate-600 mt-2">
        UK/EU import status, documentation and testing flags. Do not hide increased controls on certain Indian dried spices.
      </p>
      <table className="w-full text-sm mt-6 bg-white border rounded-xl">
        <thead>
          <tr className="text-left border-b">
            <th className="p-3">Spice</th>
            <th className="p-3">UK</th>
            <th className="p-3">EU</th>
            <th className="p-3">Docs</th>
          </tr>
        </thead>
        <tbody>
          {spices.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-3">{s.canonicalName}</td>
              <td className="p-3 text-xs">{s.compliance?.ukImportStatus}</td>
              <td className="p-3 text-xs">{s.compliance?.euImportStatus}</td>
              <td className="p-3 text-xs">{s.compliance?.requiredDocuments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
