"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import { parseManualEmails, parseRecipientCsv, type RecipientParseResult } from "@/lib/ses-recipients";
import type { SesCampaign } from "@spicycorner/shared";

export default function UploadRecipientsPage() {
  const api = useApiClient();
  const [campaigns, setCampaigns] = useState<SesCampaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [manual, setManual] = useState("");
  const [preview, setPreview] = useState<RecipientParseResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ campaigns: SesCampaign[] }>("/ses-email/campaigns");
    const editable = res.campaigns.filter((c) => c.status === "draft" || c.status === "scheduled");
    setCampaigns(editable);
    if (!campaignId && editable[0]) setCampaignId(editable[0].campaignId);
  }, [api, campaignId]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [load]);

  const onFile = async (file: File) => {
    setError("");
    setMessage("");
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      const csv = XLSX.utils.sheet_to_csv(sheet!);
      setPreview(parseRecipientCsv(csv));
      return;
    }
    const text = await file.text();
    setPreview(parseRecipientCsv(text));
  };

  const previewManual = () => {
    setPreview(parseManualEmails(manual));
  };

  const importRecipients = async () => {
    if (!campaignId || !preview?.valid.length) return;
    setImporting(true);
    setError("");
    try {
      const res = await api<{
        imported: number;
        skippedInvalid?: number;
        skippedDuplicate: number;
        skippedSuppressed: number;
        skippedBounced?: number;
        skippedBlocked?: number;
        totalRecipients?: number;
      }>("/ses-email/recipients", {
        method: "POST",
        body: JSON.stringify({ campaignId, recipients: preview.valid }),
      });
      const bounced = res.skippedBounced ?? 0;
      const suppressed = res.skippedSuppressed ?? 0;
      const invalid = res.skippedInvalid ?? 0;
      setMessage(
        `Imported ${res.imported}` +
          (invalid ? `, ${invalid} invalid skipped` : "") +
          (res.skippedDuplicate ? `, ${res.skippedDuplicate} duplicates skipped` : "") +
          (bounced ? `, ${bounced} bounced skipped` : "") +
          (suppressed ? `, ${suppressed} suppressed/unsubscribed skipped` : "") +
          (typeof res.totalRecipients === "number" ? `. Campaign total: ${res.totalRecipients}` : "") +
          "."
      );
      setPreview(null);
      setManual("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Upload Recipient List</h1>
      <p className="text-sm text-slate-500">
        CSV / Excel / manual entry. Required column: <strong>Email</strong>. Optional: Name, Company, City, State, Country.
        Lists belong to one campaign only.
      </p>

      <div className="rounded-xl border bg-white p-5 space-y-4">
        <label className="block text-sm">
          Campaign
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            {campaigns.length === 0 && <option value="">No draft/scheduled campaigns</option>}
            {campaigns.map((c) => (
              <option key={c.campaignId} value={c.campaignId}>
                {c.name} ({c.status}) — {c.recipientCount} recipients
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Upload CSV or Excel
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="mt-1 block w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>

        <label className="block text-sm">
          Or paste emails (comma / newline)
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 min-h-[100px] text-sm"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="alice@example.com, bob@example.com"
          />
        </label>
        <button type="button" onClick={previewManual} className="text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50">
          Preview manual list
        </button>

        {preview && (
          <div className="rounded-lg bg-slate-50 border p-4 text-sm space-y-2">
            <p>
              <strong>{preview.valid.length}</strong> valid ·{" "}
              <strong>{preview.invalid.length}</strong> invalid ·{" "}
              <strong>{preview.duplicatesRemoved}</strong> duplicates removed
            </p>
            <ul className="max-h-40 overflow-auto text-xs font-mono">
              {preview.valid.slice(0, 30).map((r) => (
                <li key={r.email}>
                  {r.email}
                  {r.name ? ` — ${r.name}` : ""}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={importing || !preview.valid.length || !campaignId}
              onClick={() => void importRecipients()}
              className="rounded-lg bg-nav text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {importing ? "Importing…" : `Import ${preview.valid.length} recipients`}
            </button>
          </div>
        )}

        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
