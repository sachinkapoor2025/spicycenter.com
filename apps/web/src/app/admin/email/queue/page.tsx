"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { SesCampaign } from "@spicycorner/shared";

export default function QueuePage() {
  const api = useApiClient();
  const [pending, setPending] = useState<{ email: string; campaignId: string; status?: string }[]>([]);
  const [active, setActive] = useState<SesCampaign[]>([]);

  const load = useCallback(async () => {
    const res = await api<{ pending: typeof pending; activeCampaigns: SesCampaign[] }>("/ses-email/queue");
    setPending(res.pending);
    setActive(res.activeCampaigns);
  }, [api]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Queue</h1>
      <p className="text-sm text-slate-500">Live queue · refreshes every 10s · SES rate limit ~14/sec · cron every 1 min</p>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-3">Active campaigns</h2>
        <ul className="text-sm divide-y">
          {active.map((c) => {
            const total = Math.max(c.recipientCount, 1);
            const pct = Math.min(100, Math.round((c.sentCount / total) * 100));
            return (
              <li key={c.campaignId} className="py-3">
                <div className="flex justify-between gap-2">
                  <Link href={`/admin/email/campaigns/${c.campaignId}`} className="text-nav hover:underline font-medium">
                    {c.name}
                  </Link>
                  <span className="capitalize text-slate-500">{c.status}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Remaining ~{Math.max(0, c.queuedCount)} · Sent {c.sentCount} · Failed {c.failedCount}
                </p>
              </li>
            );
          })}
        </ul>
        {active.length === 0 && <p className="text-sm text-slate-500">No active campaigns.</p>}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-3">Pending queue sample ({pending.length})</h2>
        <ul className="text-xs font-mono max-h-64 overflow-auto divide-y">
          {pending.map((p, i) => (
            <li key={`${p.campaignId}-${p.email}-${i}`} className="py-1 flex justify-between gap-2">
              <span>{p.email}</span>
              <span className="text-slate-400 truncate">{p.campaignId.slice(0, 8)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
