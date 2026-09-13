"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { SesCampaign } from "@spicycorner/shared";

type Dashboard = {
  cards: {
    scheduledToday: number;
    scheduledThisWeek: number;
    currentlySending: number;
    sentLast24h: number;
    dailyLimit: number;
  };
  upcoming: SesCampaign[];
  recent: SesCampaign[];
};

export default function SesEmailDashboardPage() {
  const api = useApiClient();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<Dashboard>("/ses-email/dashboard");
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }
  if (!data) {
    return <p className="text-slate-500">Loading dashboard…</p>;
  }

  const cards = [
    { label: "Scheduled today", value: data.cards.scheduledToday },
    { label: "Scheduled this week", value: data.cards.scheduledThisWeek },
    { label: "Currently sending", value: data.cards.currentlySending },
    {
      label: "Sent last 24h",
      value: `${data.cards.sentLast24h} / ${data.cards.dailyLimit}`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Email Campaign Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Amazon SES · spicycenter.com · us-east-1 · up to 50,000 / day
          </p>
        </div>
        <Link
          href="/admin/email/compose"
          className="rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90"
        >
          Compose campaign
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="text-2xl font-bold text-primary mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-3">Upcoming</h2>
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No scheduled campaigns.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.upcoming.map((c) => (
                <li key={c.campaignId} className="py-2 flex justify-between gap-2">
                  <Link href={`/admin/email/campaigns/${c.campaignId}`} className="text-nav hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-slate-500 shrink-0">
                    {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-3">Recently completed</h2>
          {data.recent.length === 0 ? (
            <p className="text-sm text-slate-500">No completed campaigns yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.recent.map((c) => (
                <li key={c.campaignId} className="py-2 flex justify-between gap-2">
                  <Link href={`/admin/email/campaigns/${c.campaignId}`} className="text-nav hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-slate-500">
                    {c.sentCount} sent · {c.openCount} opens
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
