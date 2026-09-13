"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { SesCampaign } from "@spicycorner/shared";

export default function CampaignsPage() {
  const api = useApiClient();
  const [campaigns, setCampaigns] = useState<SesCampaign[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ campaigns: SesCampaign[] }>("/ses-email/campaigns");
    setCampaigns(res.campaigns);
  }, [api]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [load]);

  const action = async (id: string, actionName: string) => {
    await api(`/ses-email/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify({ action: actionName }),
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">Campaigns</h1>
        <Link href="/admin/email/compose" className="text-sm bg-nav text-white rounded-lg px-3 py-2">
          New campaign
        </Link>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Recipients</th>
              <th className="px-3 py-2">Sent / Open / Click</th>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.campaignId} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/admin/email/campaigns/${c.campaignId}`} className="text-nav hover:underline font-medium">
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2 capitalize">{c.status}</td>
                <td className="px-3 py-2">{c.recipientCount}</td>
                <td className="px-3 py-2">
                  {c.sentCount} / {c.openCount} / {c.clickCount}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <Link href={`/admin/email/compose?id=${c.campaignId}`} className="text-nav hover:underline">
                      Edit
                    </Link>
                  )}
                  {c.status === "sending" && (
                    <button type="button" className="text-amber-700" onClick={() => void action(c.campaignId, "pause")}>
                      Pause
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button type="button" className="text-green-700" onClick={() => void action(c.campaignId, "resume")}>
                      Resume
                    </button>
                  )}
                  {!["completed", "cancelled"].includes(c.status) && (
                    <button type="button" className="text-red-600" onClick={() => void action(c.campaignId, "cancel")}>
                      Cancel
                    </button>
                  )}
                  <button type="button" className="text-slate-600" onClick={() => void action(c.campaignId, "duplicate")}>
                    Duplicate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && <p className="p-4 text-slate-500 text-sm">No campaigns yet.</p>}
      </div>
    </div>
  );
}
