"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import { HorizontalBarChart, AreaChart, ChartLegend } from "@/components/admin/Charts";
import { SalesReportPanel } from "@/components/admin/SalesReportPanel";
import { VisitorAnalyticsPanel } from "@/components/admin/VisitorAnalyticsPanel";
import { LiveVisitorsPanel } from "@/components/admin/LiveVisitorsPanel";
import { VisitorsPanel } from "@/components/admin/VisitorsPanel";
import { OrderRoutesPanel } from "@/components/admin/OrderRoutesPanel";
import { downloadCsv, downloadPdfReport, formatMoney } from "@/lib/admin-utils";

interface ProductStat {
  slug: string;
  views: number;
  adds: number;
}
interface SearchStat {
  term: string;
  count: number;
  zero: number;
}
interface Overview {
  totals: Record<string, number>;
  trafficByDay: { day: string; pageViews: number; purchases: number }[];
}

interface LocationStat {
  location: string;
  orderCount: number;
  revenueUSD: number;
  revenueINR: number;
}

interface TrafficStat {
  source: string;
  visitors: number;
  orders: number;
  conversionRate: number;
}

interface LabelCount {
  label: string;
  count: number;
}

interface Insights {
  byLocation: LocationStat[];
  byTrafficSource: TrafficStat[];
  byDevice: LabelCount[];
  byBrowser: LabelCount[];
  byOs: LabelCount[];
  ordersByDay: { day: string; orders: number; pageViews: number }[];
}

type AnalyticsTab = "overview" | "order-routes" | "visitor-analytics" | "live" | "sessions";

function parseAnalyticsTab(raw: string | null): AnalyticsTab {
  if (
    raw === "live" ||
    raw === "sessions" ||
    raw === "overview" ||
    raw === "visitor-analytics" ||
    raw === "order-routes"
  ) {
    return raw;
  }
  // Back-compat: old ?tab=visitors meant visitor analytics
  if (raw === "visitors") return "visitor-analytics";
  return "overview";
}

function AdminAnalyticsPageInner() {
  const apiClient = useApiClient();
  const searchParams = useSearchParams();
  const initialTab = useMemo(
    () => parseAnalyticsTab(searchParams.get("tab")),
    [searchParams]
  );
  const [tab, setTab] = useState<AnalyticsTab>(initialTab);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [products, setProducts] = useState<ProductStat[]>([]);
  const [searches, setSearches] = useState<SearchStat[]>([]);
  const [zeroResult, setZeroResult] = useState<SearchStat[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rollup-backed KPIs first — do not block Overview on heavy session rebuilds.
  useEffect(() => {
    if (tab !== "overview") return;
    setLoading(true);
    setError("");
    Promise.all([
      apiClient<{ products: ProductStat[] }>(`/admin/analytics/products?days=${days}`),
      apiClient<{ searches: SearchStat[]; zeroResult: SearchStat[] }>(
        `/admin/analytics/searches?days=${days}`
      ),
      apiClient<Overview>(`/admin/analytics/overview?days=${days}`),
    ])
      .then(([p, s, o]) => {
        setProducts(p.products);
        setSearches(s.searches);
        setZeroResult(s.zeroResult);
        setOverview(o);
      })
      .catch((err) => {
        setProducts([]);
        setSearches([]);
        setZeroResult([]);
        setOverview(null);
        setError(err instanceof Error ? err.message : "Could not load analytics");
      })
      .finally(() => setLoading(false));
  }, [apiClient, days, tab]);

  // Insights rebuild sessions from raw events — load after KPIs so Overview stays snappy.
  useEffect(() => {
    if (tab !== "overview") return;
    let cancelled = false;
    setInsightsLoading(true);
    setInsights(null);
    apiClient<Insights>(`/admin/analytics/insights?days=${days}`)
      .then((i) => {
        if (!cancelled) setInsights(i);
      })
      .catch(() => {
        if (!cancelled) setInsights(null);
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, days, tab]);

  const productChart = products.slice(0, 8).map((p) => ({
    label: p.slug.replace(/-/g, " "),
    value: p.views,
    sub: `${p.adds} adds`,
  }));

  const searchChart = searches.slice(0, 8).map((s) => ({
    label: s.term,
    value: s.count,
    sub: s.zero ? `${s.zero} zero-result` : undefined,
  }));

  const conversionRate =
    overview && overview.totals.page_view
      ? (((overview.totals.purchase ?? 0) / overview.totals.page_view) * 100).toFixed(2)
      : "0";

  const trendData =
    insights?.ordersByDay ??
    overview?.trafficByDay.map((d) => ({
      day: d.day,
      orders: d.purchases,
      pageViews: d.pageViews,
    })) ??
    [];

  const exportAnalytics = () => {
    if (!overview) return;
    downloadCsv(`analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Metric", "Value"],
      ["Page views", String(overview.totals.page_view ?? 0)],
      ["Product views", String(overview.totals.product_view ?? 0)],
      ["Cart adds", String(overview.totals.cart_add ?? 0)],
      ["Searches", String(overview.totals.search ?? 0)],
      ["Purchases", String(overview.totals.purchase ?? 0)],
      ["Conversion rate %", conversionRate],
      [],
      ["Day", "Page views", "Orders"],
      ...trendData.map((d) => [d.day, String(d.pageViews), String(d.orders)]),
      [],
      ["Location", "Orders", "Revenue USD", "Revenue INR"],
      ...(insights?.byLocation ?? []).map((l) => [
        l.location,
        String(l.orderCount),
        l.revenueUSD.toFixed(2),
        l.revenueINR.toFixed(2),
      ]),
      [],
      ["Traffic source", "Visitors", "Orders", "Conversion %"],
      ...(insights?.byTrafficSource ?? []).map((t) => [
        t.source,
        String(t.visitors),
        String(t.orders),
        (t.conversionRate * 100).toFixed(2),
      ]),
      [],
      ["Product", "Views", "Adds"],
      ...products.map((p) => [p.slug, String(p.views), String(p.adds)]),
      [],
      ["Search term", "Count", "Zero results"],
      ...searches.map((s) => [s.term, String(s.count), String(s.zero ?? 0)]),
    ]);
  };

  const exportPdf = () => {
    if (!overview) return;
    const rows = (insights?.byLocation ?? [])
      .map(
        (l) =>
          `<tr><td>${l.location}</td><td>${l.orderCount}</td><td>${formatMoney(l.revenueUSD, "USD")}</td><td>${formatMoney(l.revenueINR, "INR")}</td></tr>`
      )
      .join("");
    const traffic = (insights?.byTrafficSource ?? [])
      .map(
        (t) =>
          `<tr><td>${t.source}</td><td>${t.visitors}</td><td>${t.orders}</td><td>${(t.conversionRate * 100).toFixed(1)}%</td></tr>`
      )
      .join("");
    downloadPdfReport(
      `Analytics ${days}d`,
      `<h1>Analytics — last ${days} days</h1>
      <p>Page views: ${overview.totals.page_view ?? 0} · Purchases: ${overview.totals.purchase ?? 0} · Conversion: ${conversionRate}%</p>
      <h2>Orders &amp; revenue by location</h2>
      <table><thead><tr><th>Location</th><th>Orders</th><th>USD</th><th>INR</th></tr></thead><tbody>${rows || "<tr><td colspan=4>No data</td></tr>"}</tbody></table>
      <h2>Traffic sources</h2>
      <table><thead><tr><th>Source</th><th>Visitors</th><th>Orders</th><th>Conv.</th></tr></thead><tbody>${traffic || "<tr><td colspan=4>No data</td></tr>"}</tbody></table>`
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "overview" as const, label: "Overview" },
              { id: "order-routes" as const, label: "Order routes" },
              { id: "visitor-analytics" as const, label: "Visitor analytics" },
              { id: "live" as const, label: "Live visitor" },
              { id: "sessions" as const, label: "Visitors" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                tab === t.id
                  ? "bg-nav text-white border-nav"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
          {tab === "overview" && (
            <>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              {overview && (
                <>
                  <button
                    type="button"
                    onClick={exportAnalytics}
                    className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="text-sm bg-nav text-white px-3 py-1.5 rounded-lg"
                  >
                    Export PDF
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {tab === "live" ? (
        <LiveVisitorsPanel />
      ) : tab === "visitor-analytics" ? (
        <VisitorAnalyticsPanel />
      ) : tab === "sessions" ? (
        <VisitorsPanel />
      ) : tab === "order-routes" ? (
        <OrderRoutesPanel />
      ) : loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : (
        <>
          <div className="mb-8">
            <SalesReportPanel />
          </div>

          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Page views", value: overview.totals.page_view ?? 0 },
                { label: "Product views", value: overview.totals.product_view ?? 0 },
                { label: "Cart adds", value: overview.totals.cart_add ?? 0 },
                { label: "Searches", value: overview.totals.search ?? 0 },
                { label: "Conversion rate", value: `${conversionRate}%` },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white border rounded-xl p-4">
                  <p className="text-xs uppercase text-slate-400">{kpi.label}</p>
                  <p className="text-xl font-bold mt-1">
                    {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {trendData.length > 0 && (
            <section className="bg-white border rounded-xl p-5 mb-6">
              <h2 className="font-semibold mb-1">Daily order &amp; traffic trend</h2>
              <p className="text-xs text-slate-500 mb-4">Hover for counts · updates with date range</p>
              <AreaChart
                data={trendData.map((d) => ({
                  label: d.day,
                  value: d.pageViews,
                  secondary: d.orders,
                }))}
                height={180}
                showSecondary
                valueLabel="Page views"
                secondaryLabel="Orders"
              />
              <ChartLegend
                items={[
                  { color: "#183a68", label: "Page views" },
                  { color: "#16a34a", label: "Orders" },
                ]}
              />
            </section>
          )}

          {insightsLoading && !insights && (
            <p className="text-sm text-slate-500 mb-6">Loading location &amp; traffic insights…</p>
          )}

          {insights && (
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <section className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold mb-3">Orders &amp; revenue by location</h2>
                {insights.byLocation.length === 0 ? (
                  <p className="text-sm text-slate-500">No paid orders in this period yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-400">
                      <tr>
                        <th className="py-1">Location</th>
                        <th className="py-1 text-right">Orders</th>
                        <th className="py-1 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.byLocation.map((l) => (
                        <tr key={l.location} className="border-t">
                          <td className="py-2">{l.location}</td>
                          <td className="py-2 text-right">{l.orderCount}</td>
                          <td className="py-2 text-right text-xs">
                            {l.revenueUSD > 0 && formatMoney(l.revenueUSD, "USD")}
                            {l.revenueUSD > 0 && l.revenueINR > 0 && " + "}
                            {l.revenueINR > 0 && formatMoney(l.revenueINR, "INR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold mb-3">Traffic sources</h2>
                {insights.byTrafficSource.length === 0 ? (
                  <p className="text-sm text-slate-500">No session data yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-400">
                      <tr>
                        <th className="py-1">Source</th>
                        <th className="py-1 text-right">Visitors</th>
                        <th className="py-1 text-right">Orders</th>
                        <th className="py-1 text-right">Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.byTrafficSource.map((t) => (
                        <tr key={t.source} className="border-t">
                          <td className="py-2">{t.source}</td>
                          <td className="py-2 text-right">{t.visitors}</td>
                          <td className="py-2 text-right">{t.orders}</td>
                          <td className="py-2 text-right">{(t.conversionRate * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          )}

          {insights && (
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { title: "Device", data: insights.byDevice },
                { title: "Browser", data: insights.byBrowser },
                { title: "Operating system", data: insights.byOs },
              ].map((block) => (
                <section key={block.title} className="bg-white border rounded-xl p-5">
                  <h2 className="font-semibold mb-3 text-sm">{block.title}</h2>
                  {block.data.length === 0 ? (
                    <p className="text-xs text-slate-500">No data yet.</p>
                  ) : (
                    <HorizontalBarChart
                      items={block.data.map((d) => ({ label: d.label, value: d.count }))}
                      maxItems={6}
                    />
                  )}
                </section>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold mb-3">Most viewed products</h2>
              {products.length === 0 ? (
                <p className="text-sm text-slate-500">No product views yet. Browse the storefront to start tracking.</p>
              ) : (
                <>
                  <HorizontalBarChart items={productChart} color="#2563eb" />
                  <table className="w-full text-sm mt-6 border-t pt-4">
                    <thead className="text-left text-slate-400 text-xs">
                      <tr>
                        <th className="py-1">Product</th>
                        <th className="py-1 text-right">Views</th>
                        <th className="py-1 text-right">Adds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.slug} className="border-t">
                          <td className="py-2">
                            <Link href={`/products/${p.slug}`} className="text-nav hover:underline">
                              {p.slug}
                            </Link>
                          </td>
                          <td className="py-2 text-right">{p.views}</td>
                          <td className="py-2 text-right">{p.adds}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

            <section className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold mb-3">Top searches</h2>
              {searches.length === 0 ? (
                <p className="text-sm text-slate-500">No searches yet.</p>
              ) : (
                <>
                  <HorizontalBarChart items={searchChart} color="#d97706" />
                  <table className="w-full text-sm mt-6 border-t pt-4">
                    <thead className="text-left text-slate-400 text-xs">
                      <tr>
                        <th className="py-1">Query</th>
                        <th className="py-1 text-right">Count</th>
                        <th className="py-1 text-right">No results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searches.map((s) => (
                        <tr key={s.term} className="border-t">
                          <td className="py-2">{s.term}</td>
                          <td className="py-2 text-right">{s.count}</td>
                          <td className="py-2 text-right">{s.zero || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {zeroResult.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-red-600 mb-2">
                    Zero-result searches (product gaps)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {zeroResult.map((s) => (
                      <span
                        key={s.term}
                        className="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700"
                        title={`${s.zero} searches with no results`}
                      >
                        {s.term} ({s.zero})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading…</p>}>
      <AdminAnalyticsPageInner />
    </Suspense>
  );
}
