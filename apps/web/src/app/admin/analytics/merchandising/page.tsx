"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import { HorizontalBarChart } from "@/components/admin/Charts";
import { downloadCsv, formatMoney } from "@/lib/admin-utils";

type Funnel = {
  impressions: number;
  clicks: number;
  views: number;
  adds: number;
  checkouts: number;
  orders: number;
  revenueUsd: number;
  qty: number;
  homepageImpressions: number;
  homepageClicks: number;
};

type Row = {
  rank: number;
  slug: string;
  name: string;
  categorySlug: string;
  score: number;
  trend: "rising" | "stable" | "falling";
  quadrant: string;
  sampleQuality: "low" | "medium" | "high";
  sampleSize: number;
  ctr: number;
  atcRate: number;
  conversionRate: number;
  metrics: Funnel;
  homepageExposure: boolean;
  homepageRank: number | null;
  recommendation: string | null;
};

type Totals = {
  products: number;
  impressions: number;
  clicks: number;
  views: number;
  adds: number;
  checkouts: number;
  orders: number;
  revenueUsd: number;
  qty: number;
  homepageClicks: number;
  homepageImpressions: number;
  conversionRate: number;
  homepageCtr: number;
  topProduct: string;
  topCategory: string;
  rising: number;
  falling: number;
  highClickLowOrder: number;
  lowClickHighOrder: number;
};

type Config = {
  homepageProductCount: number;
  explorationPercentage: number;
  performanceWindowDays: number;
  trendWindowDays: number;
  minimumClicksForRanking: number;
  minimumOrdersForConversionRanking: number;
  maxShareSameCategory: number;
  countryPersonalizationEnabled: boolean;
  weights: {
    ctr: number;
    atcRate: number;
    conversionRate: number;
    orders: number;
    revenue: number;
    trend: number;
  };
  overrides: Record<string, { pin?: boolean; exclude?: boolean; boost?: number }>;
};

const QUADRANT_LABEL: Record<string, string> = {
  high_click_high_order: "High click / high order — increase exposure",
  high_click_low_order: "High click / low order — investigate, do not just push harder",
  low_click_high_order: "Low click / high order — hidden winners",
  low_click_low_order: "Low click / low order — reduce unless strategic",
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </div>
  );
}

export default function MerchandisingPage() {
  const api = useApiClient();
  const [days, setDays] = useState(30);
  const [sortKey, setSortKey] = useState<"score" | "clicks" | "orders" | "revenueUsd" | "ctr" | "conversionRate">("score");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [insights, setInsights] = useState<{
    recommendations: string[];
    countries: { country: string; clicks: number; orders: number; revenueUsd: number }[];
    seo: { country: string; message: string }[];
  } | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    product: Row;
    recommendation: string | null;
    geo: {
      countries: { label: string; clicks: number; orders: number; revenueUsd: number }[];
      regions: { label: string; clicks: number; orders: number; revenueUsd: number }[];
      cities: { label: string; clicks: number; orders: number; revenueUsd: number }[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [perf, merch, cfg] = await Promise.all([
        api<{ days: number; totals: Totals; products: Row[] }>(`/admin/analytics/performance?days=${days}`),
        api<{
          recommendations: string[];
          countries: { country: string; clicks: number; orders: number; revenueUsd: number }[];
          seo: { country: string; message: string }[];
        }>(`/admin/analytics/merchandising?days=${days}`),
        api<{ config: Config }>("/admin/homepage-ranking"),
      ]);
      setRows(perf.products);
      setTotals(perf.totals);
      setInsights(merch);
      setConfig(cfg.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load merchandising analytics");
    } finally {
      setLoading(false);
    }
  }, [api, days]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    api<{
      product: Row;
      recommendation: string | null;
      geo: {
        countries: { label: string; clicks: number; orders: number; revenueUsd: number }[];
        regions: { label: string; clicks: number; orders: number; revenueUsd: number }[];
        cities: { label: string; clicks: number; orders: number; revenueUsd: number }[];
      };
    }>(`/admin/analytics/performance/${encodeURIComponent(selected)}?days=${days}`)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [api, days, selected]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortKey === "revenueUsd" ? a.metrics.revenueUsd : sortKey === "clicks" ? a.metrics.clicks : sortKey === "orders" ? a.metrics.orders : a[sortKey];
      const bv = sortKey === "revenueUsd" ? b.metrics.revenueUsd : sortKey === "clicks" ? b.metrics.clicks : sortKey === "orders" ? b.metrics.orders : b[sortKey];
      return Number(bv) - Number(av);
    });
    return copy;
  }, [rows, sortKey]);

  async function saveConfig(next: Config) {
    setSaving(true);
    try {
      await api("/admin/homepage-ranking", { method: "PUT", body: JSON.stringify(next) });
      setConfig(next);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function override(slug: string, patch: { pin?: boolean; exclude?: boolean }) {
    if (!config) return;
    const current = config.overrides[slug] ?? {};
    const nextOverrides = { ...config.overrides, [slug]: { ...current, ...patch } };
    await saveConfig({ ...config, overrides: nextOverrides });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product performance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Funnel ranking for homepage exposure — not clicks alone. Orders, conversion, and trend all count.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm"
            onClick={() =>
              downloadCsv(`product-performance-${days}d.csv`, [
                ["rank", "product", "category", "impressions", "clicks", "ctr", "views", "adds", "orders", "conversion", "revenue_usd", "score", "trend", "quadrant", "homepage"],
                ...sorted.map((r) => [
                  String(r.rank),
                  r.name,
                  r.categorySlug,
                  String(r.metrics.impressions),
                  String(r.metrics.clicks),
                  pct(r.ctr),
                  String(r.metrics.views),
                  String(r.metrics.adds),
                  String(r.metrics.orders),
                  pct(r.conversionRate),
                  String(r.metrics.revenueUsd.toFixed(2)),
                  String(r.score),
                  r.trend,
                  r.quadrant,
                  r.homepageExposure ? "yes" : "no",
                ]),
              ])
            }
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded-lg bg-nav text-white px-3 py-1.5 text-sm font-semibold"
            onClick={() => api("/admin/homepage-ranking/refresh", { method: "POST" }).then(() => load())}
          >
            Refresh homepage ranking
          </button>
        </div>
      </div>

      {error ? <p className="text-red-600 text-sm mb-4">{error}</p> : null}
      {loading ? <p className="text-slate-500 text-sm">Loading performance…</p> : null}

      {totals ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
          <Kpi label="Revenue" value={formatMoney(totals.revenueUsd, "USD")} />
          <Kpi label="Orders" value={totals.orders.toLocaleString()} sub={`${totals.qty.toLocaleString()} units`} />
          <Kpi
            label="AOV"
            value={totals.orders > 0 ? formatMoney(totals.revenueUsd / totals.orders, "USD") : "—"}
          />
          <Kpi label="Clicks" value={totals.clicks.toLocaleString()} />
          <Kpi label="Views" value={totals.views.toLocaleString()} />
          <Kpi label="Add to carts" value={totals.adds.toLocaleString()} />
          <Kpi label="Checkouts" value={totals.checkouts.toLocaleString()} />
          <Kpi label="Conversion" value={pct(totals.conversionRate)} />
          <Kpi label="Homepage CTR" value={pct(totals.homepageCtr)} />
          <Kpi label="Top product" value={totals.topProduct || "—"} />
          <Kpi label="Top country" value={insights?.countries[0]?.country || "—"} />
          <Kpi label="Hidden winners" value={String(totals.lowClickHighOrder)} sub="low click / high order" />
        </div>
      ) : null}

      {insights?.recommendations.length ? (
        <section className="mb-8 border rounded-xl p-5 bg-amber-50/40">
          <h2 className="font-semibold mb-3">What needs attention?</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            {insights.recommendations.slice(0, 8).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="text-sm text-slate-500 mb-8">
          Recommendations appear after real funnel data exists. Until then, ranking uses catalog diversity and units sold.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Top products by orders</h3>
          <HorizontalBarChart items={sorted.slice(0, 8).map((r) => ({ label: r.name, value: r.metrics.orders }))} />
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Top products by revenue</h3>
          <HorizontalBarChart
            items={sorted
              .slice()
              .sort((a, b) => b.metrics.revenueUsd - a.metrics.revenueUsd)
              .slice(0, 8)
              .map((r) => ({ label: r.name, value: Math.round(r.metrics.revenueUsd), sub: formatMoney(r.metrics.revenueUsd, "USD") }))}
            color="#16a34a"
          />
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Top products by clicks</h3>
          <HorizontalBarChart
            items={sorted
              .slice()
              .sort((a, b) => b.metrics.clicks - a.metrics.clicks)
              .slice(0, 8)
              .map((r) => ({ label: r.name, value: r.metrics.clicks }))}
          />
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Top products by conversion</h3>
          <HorizontalBarChart
            items={sorted
              .filter((r) => r.sampleQuality !== "low")
              .slice()
              .sort((a, b) => b.conversionRate - a.conversionRate)
              .slice(0, 8)
              .map((r) => ({ label: r.name, value: Math.round(r.conversionRate * 1000) / 10, sub: pct(r.conversionRate) }))}
            color="#7c3aed"
          />
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Countries by orders</h3>
          <HorizontalBarChart
            items={(insights?.countries ?? []).slice(0, 8).map((c) => ({ label: c.country, value: c.orders }))}
          />
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <h3 className="font-semibold mb-3">SEO / merchandising opportunities</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {(insights?.seo ?? []).slice(0, 6).map((s) => (
              <li key={s.country}>
                <span className="font-semibold">{s.country}:</span> {s.message}
              </li>
            ))}
            {!insights?.seo.length ? <li>Not enough geographic order data yet.</li> : null}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {Object.entries(QUADRANT_LABEL).map(([id, label]) => (
          <span key={id} className="rounded-full bg-slate-100 px-2 py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white mb-8">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {(["score", "clicks", "orders", "revenueUsd", "ctr", "conversionRate"] as const).map((key) => (
                <th key={key} className="px-3 py-2">
                  <button type="button" className="font-semibold" onClick={() => setSortKey(key)}>
                    {key === "revenueUsd" ? "Revenue" : key === "conversionRate" ? "Conv." : key.toUpperCase()}
                    {sortKey === key ? " ↓" : ""}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Trend</th>
              <th className="px-3 py-2">Homepage</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 80).map((r) => (
              <tr key={r.slug} className="border-t">
                <td className="px-3 py-2 font-semibold">{r.score}</td>
                <td className="px-3 py-2">{r.metrics.clicks.toLocaleString()}</td>
                <td className="px-3 py-2">{r.metrics.orders.toLocaleString()}</td>
                <td className="px-3 py-2">{formatMoney(r.metrics.revenueUsd, "USD")}</td>
                <td className="px-3 py-2">{pct(r.ctr)}</td>
                <td className="px-3 py-2">{pct(r.conversionRate)}</td>
                <td className="px-3 py-2">
                  <button type="button" className="text-nav underline text-left" onClick={() => setSelected(r.slug)}>
                    {r.name}
                  </button>
                  <div className="text-xs text-slate-400">
                    {r.categorySlug} · {r.quadrant.replaceAll("_", " ")} · sample {r.sampleQuality}
                  </div>
                </td>
                <td className="px-3 py-2">{r.trend}</td>
                <td className="px-3 py-2">{r.homepageExposure ? `#${r.homepageRank}` : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button type="button" className="text-xs underline mr-2" onClick={() => override(r.slug, { pin: true })}>
                    Pin
                  </button>
                  <button type="button" className="text-xs underline" onClick={() => override(r.slug, { exclude: true })}>
                    Exclude
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail ? (
        <section className="border rounded-xl p-5 bg-white mb-8">
          <div className="flex justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">{detail.product.name}</h2>
            <Link href={`/products/${detail.product.slug}`} className="text-sm text-nav underline" target="_blank">
              Open PDP
            </Link>
          </div>
          {detail.recommendation ? <p className="text-sm mb-4">{detail.recommendation}</p> : null}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Countries</h3>
              <HorizontalBarChart items={detail.geo.countries.map((c) => ({ label: c.label, value: c.orders || c.clicks }))} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Regions</h3>
              <HorizontalBarChart items={detail.geo.regions.map((c) => ({ label: c.label, value: c.orders || c.clicks }))} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Cities (suppressed below 5 events)</h3>
              <HorizontalBarChart items={detail.geo.cities.map((c) => ({ label: c.label, value: c.orders || c.clicks }))} />
            </div>
          </div>
        </section>
      ) : null}

      {config ? (
        <section className="border rounded-xl p-5 bg-white">
          <h2 className="font-semibold mb-3">Ranking configuration</h2>
          <p className="text-xs text-slate-500 mb-4">
            Weights must stay as fractions of 1. Saving rebuilds the homepage snapshot. Country personalization stays off until you have enough data.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {(
              [
                ["homepageProductCount", "Homepage pool"],
                ["explorationPercentage", "Exploration %"],
                ["minimumClicksForRanking", "Min clicks"],
                ["minimumOrdersForConversionRanking", "Min orders for conversion"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                {label}
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1"
                  value={config[key]}
                  onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm mt-3">
            {(Object.keys(config.weights) as Array<keyof Config["weights"]>).map((key) => (
              <label key={key} className="block">
                Weight: {key}
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  className="mt-1 w-full border rounded-lg px-2 py-1"
                  value={config.weights[key]}
                  onChange={(e) =>
                    setConfig({ ...config, weights: { ...config.weights, [key]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            className="mt-4 rounded-lg bg-nav text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={() => config && saveConfig(config)}
          >
            {saving ? "Saving…" : "Save weights and rebuild homepage"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
