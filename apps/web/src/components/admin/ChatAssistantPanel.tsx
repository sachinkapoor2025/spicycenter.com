"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import { HorizontalBarChart } from "@/components/admin/Charts";
import { downloadCsv, formatMoney } from "@/lib/admin-utils";

type ChatAnalytics = {
  days: number;
  totals: {
    opens: number;
    closes: number;
    messages: number;
    searches: number;
    productClicks: number;
    addToCarts: number;
    impressions: number;
    orders: number;
    revenueUsd: number;
  };
  conversionRate: number;
  revenuePerSession: number;
  intents: { intent: string; count: number; share: number }[];
  searches: { term: string; count: number; zero: number }[];
  unfulfilled: { term: string; count: number }[];
  products: { slug: string; impressions: number; clicks: number; adds: number }[];
  countries: { country: string; count: number }[];
};

type ChatConfig = {
  enabled: boolean;
  launcherEnabled: boolean;
  invitationEnabled: boolean;
  invitationDelayMs: number;
  welcomeMessage: string;
  productResultCount: number;
  upsellLimit: number;
  countryPersonalization: boolean;
};

export function ChatAssistantPanel() {
  const apiClient = useApiClient();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<ChatAnalytics | null>(null);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      apiClient<ChatAnalytics>(`/admin/analytics/chat?days=${days}`),
      apiClient<{ config: ChatConfig }>("/config/chat"),
    ])
      .then(([analytics, cfg]) => {
        setData(analytics);
        setConfig(cfg.config);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load chat analytics");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [apiClient, days]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await apiClient<{ config: ChatConfig }>("/admin/config/chat", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setConfig(res.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const t = data?.totals;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shopping assistant</h1>
          <p className="text-sm text-slate-500">Chat sessions, product discovery, and demand we don't stock yet.</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-sm ${days === d ? "bg-primary text-white" : "bg-white border"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Chat sessions", value: t.opens },
              { label: "Messages", value: t.messages },
              { label: "Product clicks", value: t.productClicks },
              { label: "Add to carts", value: t.addToCarts },
              { label: "Searches", value: t.searches },
              { label: "Chat-assisted orders", value: t.orders },
              { label: "Chat revenue", value: formatMoney(t.revenueUsd, "USD") },
              { label: "Conv. / session", value: `${((data?.conversionRate ?? 0) * 100).toFixed(1)}%` },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border bg-white p-4">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="mt-1 text-xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold mb-3">Top intents</h2>
              {(data?.intents.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">No assistant messages yet.</p>
              ) : (
                <HorizontalBarChart
                  items={(data?.intents ?? []).map((i) => ({
                    label: i.intent.replace(/_/g, " "),
                    value: i.count,
                    sub: `${Math.round(i.share * 100)}%`,
                  }))}
                />
              )}
            </section>
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold mb-3">Unfulfilled searches (CJ opportunity)</h2>
              {(data?.unfulfilled.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">No zero-result assistant searches yet.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Customers asked for these, but the catalog had no match. Use this list when importing from CJ.
                  </p>
                  <ul className="text-sm divide-y">
                    {data?.unfulfilled.map((u) => (
                      <li key={u.term} className="flex justify-between py-2">
                        <span>{u.term}</span>
                        <span className="text-slate-500">{u.count}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/admin/cj-dropshipping" className="mt-3 inline-block text-sm text-nav hover:underline">
                    Search CJ catalog →
                  </Link>
                </>
              )}
            </section>
          </div>

          <section className="rounded-xl border bg-white p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Products from chat</h2>
              <button
                type="button"
                className="text-sm text-nav hover:underline"
                onClick={() =>
                  downloadCsv("chat-products.csv", [
                    ["Slug", "Impressions", "Clicks", "Adds"],
                    ...(data?.products ?? []).map((p) => [
                      p.slug,
                      String(p.impressions),
                      String(p.clicks),
                      String(p.adds),
                    ]),
                  ])
                }
              >
                Export CSV
              </button>
            </div>
            {(data?.products.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No chat product interactions yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-400 text-xs">
                  <tr>
                    <th className="py-1">Product</th>
                    <th className="py-1 text-right">Shown</th>
                    <th className="py-1 text-right">Clicks</th>
                    <th className="py-1 text-right">Adds</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.products.map((p) => (
                    <tr key={p.slug} className="border-t">
                      <td className="py-2">
                        <Link href={`/products/${p.slug}`} className="text-nav hover:underline">
                          {p.slug}
                        </Link>
                      </td>
                      <td className="py-2 text-right">{p.impressions}</td>
                      <td className="py-2 text-right">{p.clicks}</td>
                      <td className="py-2 text-right">{p.adds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {config && (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-4">Assistant settings</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {(
              [
                ["enabled", "Chat enabled"],
                ["launcherEnabled", "Launcher enabled"],
                ["invitationEnabled", "Invitation enabled"],
                ["countryPersonalization", "Country personalization"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(config[key])}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
            <label className="block">
              Invitation delay (ms)
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={config.invitationDelayMs}
                onChange={(e) => setConfig({ ...config, invitationDelayMs: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              Product result count
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={config.productResultCount}
                onChange={(e) => setConfig({ ...config, productResultCount: Number(e.target.value) })}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void saveConfig()}
            disabled={saving}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </section>
      )}
    </div>
  );
}
