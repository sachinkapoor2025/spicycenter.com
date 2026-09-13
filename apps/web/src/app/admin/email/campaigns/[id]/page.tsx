"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import type { SesCampaign } from "@spicycorner/shared";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApiClient();
  const [campaign, setCampaign] = useState<SesCampaign | null>(null);
  const [preview, setPreview] = useState<{ email: string; name?: string; status?: string }[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ campaign: SesCampaign; recipientsPreview: typeof preview }>(
      `/ses-email/campaigns/${id}`
    );
    setCampaign(res.campaign);
    setPreview(res.recipientsPreview ?? []);
  }, [api, id]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed"));
    const t = window.setInterval(() => void load().catch(() => undefined), 15000);
    return () => window.clearInterval(t);
  }, [load]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!campaign) return <p className="text-slate-500">Loading…</p>;

  const total = Math.max(campaign.recipientCount, 1);
  const pct = Math.min(100, Math.round((campaign.sentCount / total) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <Link href="/admin/email/campaigns" className="text-sm text-nav hover:underline">
            ← Campaigns
          </Link>
          <h1 className="text-2xl font-bold text-primary mt-1">{campaign.name}</h1>
          <p className="text-sm text-slate-500 capitalize">Status: {campaign.status}</p>
        </div>
        {(campaign.status === "draft" || campaign.status === "scheduled") && (
          <Link href={`/admin/email/compose?id=${campaign.campaignId}`} className="text-sm border rounded-lg px-3 py-2">
            Edit
          </Link>
        )}
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {campaign.sentCount} / {campaign.recipientCount} ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-nav transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid sm:grid-cols-4 gap-3 text-sm pt-2">
          <div>Queued: {campaign.queuedCount}</div>
          <div>Failed: {campaign.failedCount}</div>
          <div>Opens: {campaign.openCount}</div>
          <div>Clicks: {campaign.clickCount}</div>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-5 text-sm space-y-1">
        <p>
          <strong>Subject:</strong> {campaign.subject || "—"}
        </p>
        <p>
          <strong>From:</strong> {campaign.senderName} &lt;{campaign.senderEmail}&gt;
        </p>
        <p>
          <strong>Reply-To:</strong> {campaign.replyTo}
        </p>
        {campaign.scheduledAt && (
          <p>
            <strong>Scheduled:</strong> {new Date(campaign.scheduledAt).toLocaleString()} ({campaign.timezone})
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-2">Recipients preview</h2>
        <p className="text-xs text-slate-500 mb-2">
          Full activity list (opens, clicks, orders) is on{" "}
          <Link href="/admin/email/analytics" className="text-nav hover:underline">
            Analytics
          </Link>
          .
        </p>
        <ul className="text-sm divide-y max-h-60 overflow-auto">
          {preview.map((r) => (
            <li key={r.email} className="py-1.5 flex justify-between gap-2">
              <span className="truncate">{r.email}</span>
              <span className="text-slate-500 shrink-0 capitalize">{r.status || "ready"}</span>
            </li>
          ))}
        </ul>
        {preview.length === 0 && (
          <p className="text-slate-500 text-sm">
            {campaign.recipientCount > 0
              ? `Counter shows ${campaign.recipientCount} but no recipient rows were found. Re-import the list on Upload Recipients.`
              : "No recipients yet — upload a list."}
          </p>
        )}
        <Link href="/admin/email/upload" className="inline-block mt-3 text-sm text-nav hover:underline">
          Upload recipients →
        </Link>
      </section>
    </div>
  );
}
