"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { SesCampaign, SesRecipientActivity } from "@spicycorner/shared";

type Analytics = {
  totals: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    complaints: number;
    opens: number;
    clicks: number;
  };
  byCampaign: { name: string; sent: number; opens: number; clicks: number; failed: number }[];
  campaigns?: SesCampaign[];
};

const STATUS_FILTERS = [
  "",
  "ready",
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "failed",
  "bounced",
  "unsubscribed",
] as const;

function statusLabel(r: SesRecipientActivity): string {
  if (r.placedOrder) return "placed order";
  if (r.visitedSite || r.status === "clicked") return "clicked / on site";
  if (r.status === "opened") return "opened";
  if (r.status === "delivered" || r.status === "sent") return r.status;
  return r.status || "—";
}

export default function AnalyticsPage() {
  const api = useApiClient();
  const [data, setData] = useState<Analytics | null>(null);
  const [recipients, setRecipients] = useState<SesRecipientActivity[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingRows, setLoadingRows] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [error, setError] = useState("");

  const loadTotals = useCallback(async () => {
    setData(await api<Analytics>("/ses-email/analytics"));
  }, [api]);

  const loadRecipients = useCallback(
    async (opts?: { append?: boolean; cursor?: string }) => {
      setLoadingRows(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        qs.set("limit", "50");
        if (campaignId) qs.set("campaignId", campaignId);
        if (status) qs.set("status", status);
        if (opts?.cursor) qs.set("cursor", opts.cursor);
        const res = await api<{ recipients: SesRecipientActivity[]; nextCursor?: string }>(
          `/ses-email/analytics/recipients?${qs.toString()}`
        );
        setRecipients((prev) => (opts?.append ? [...prev, ...res.recipients] : res.recipients));
        setNextCursor(res.nextCursor);
        setCursor(opts?.cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipients");
      } finally {
        setLoadingRows(false);
      }
    },
    [api, campaignId, status]
  );

  useEffect(() => {
    void loadTotals().catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [loadTotals]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const runBounceSync = async () => {
    setSyncMsg("");
    try {
      const res = await api<{ scanned: number; suppressed: number }>("/ses-email/bounces/sync", {
        method: "POST",
      });
      setSyncMsg(
        `Bounce sync done — scanned ${res.scanned} failed rows, newly suppressed ${res.suppressed}.`
      );
      await loadTotals();
      await loadRecipients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bounce sync failed");
    }
  };

  if (!data) return <p className="text-slate-500">Loading analytics…</p>;

  const maxSent = Math.max(1, ...data.byCampaign.map((c) => c.sent));
  const campaigns = data.campaigns ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Analytics</h1>
        <button
          type="button"
          onClick={() => void runBounceSync()}
          className="text-sm border rounded-lg px-3 py-2 hover:bg-slate-50"
        >
          Sync bounced emails now
        </button>
      </div>
      {syncMsg && <p className="text-sm text-green-700">{syncMsg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid sm:grid-cols-4 gap-3">
        {(
          [
            ["Queued", data.totals.queued],
            ["Sent", data.totals.sent],
            ["Delivered", data.totals.delivered],
            ["Failed", data.totals.failed],
            ["Bounced", data.totals.bounced],
            ["Complaints", data.totals.complaints],
            ["Opens", data.totals.opens],
            ["Clicks", data.totals.clicks],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className="text-xs text-slate-500 uppercase">{label}</p>
            <p className="text-xl font-bold text-primary mt-1">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-4">Sent by campaign</h2>
        <div className="space-y-3">
          {data.byCampaign.map((c, i) => (
            <div key={`${c.name}-${i}`}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate pr-2">{c.name}</span>
                <span className="text-slate-500 shrink-0">
                  {c.sent} sent · {c.opens} opens · {c.clicks} clicks
                </span>
              </div>
              <div className="h-3 rounded bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-nav"
                  style={{ width: `${Math.round((c.sent / maxSent) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          {data.byCampaign.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Email activity</h2>
            <p className="text-xs text-slate-500 mt-1">
              Per-address status: sent → delivered → opened → clicked / on site → placed order. Bounced
              addresses are auto-skipped on the next import.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-slate-600">
              Campaign
              <select
                className="mt-1 block border rounded-lg px-2 py-1.5 text-sm min-w-[12rem]"
                value={campaignId}
                onChange={(e) => {
                  setCampaignId(e.target.value);
                  setCursor(undefined);
                }}
              >
                <option value="">Recent campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.campaignId} value={c.campaignId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600">
              Status
              <select
                className="mt-1 block border rounded-lg px-2 py-1.5 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setCursor(undefined);
                }}
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s || "All"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Opened</th>
                <th className="py-2 pr-3">On site</th>
                <th className="py-2">Order</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={`${r.campaignId}-${r.email}`} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{r.email}</td>
                  <td className="py-2 pr-3 text-slate-600 truncate max-w-[10rem]">
                    {r.campaignName || r.campaignId}
                  </td>
                  <td className="py-2 pr-3 capitalize">{statusLabel(r)}</td>
                  <td className="py-2 pr-3">{r.openedAt || r.status === "opened" || r.clickedAt ? "Yes" : "—"}</td>
                  <td className="py-2 pr-3">{r.visitedSite ? "Yes" : "—"}</td>
                  <td className="py-2">
                    {r.placedOrder ? (
                      <span className="text-green-700">Yes{r.orderId ? ` (${r.orderId.slice(0, 8)})` : ""}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recipients.length === 0 && !loadingRows && (
            <p className="text-sm text-slate-500 py-4">No recipient rows yet for this filter.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {nextCursor && (
            <button
              type="button"
              disabled={loadingRows}
              className="text-sm border rounded-lg px-3 py-1.5 disabled:opacity-50"
              onClick={() => void loadRecipients({ append: true, cursor: nextCursor })}
            >
              {loadingRows ? "Loading…" : "Load more"}
            </button>
          )}
          {cursor && (
            <button
              type="button"
              className="text-sm text-nav hover:underline"
              onClick={() => void loadRecipients()}
            >
              Back to first page
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
