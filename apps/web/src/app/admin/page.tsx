"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { BarChart, AreaChart, ChartLegend } from "@/components/admin/Charts";
import { SalesReportPanel } from "@/components/admin/SalesReportPanel";

interface Overview {
  days: number;
  totals: Record<string, number>;
  funnel: { type: string; count: number }[];
  trafficByDay: { day: string; pageViews: number; purchases: number }[];
  conversionRate: number;
}

const FUNNEL_LABELS: Record<string, string> = {
  page_view: "Page views",
  product_view: "Product views",
  cart_add: "Added to cart",
  checkout_start: "Checkout started",
  purchase: "Purchased",
};

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const apiClient = useApiClient();
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiClient<Overview>(`/admin/analytics/overview?days=${days}`)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load analytics");
      })
      .finally(() => setLoading(false));
  }, [apiClient, days]);

  const maxFunnel = Math.max(1, ...(data?.funnel.map((f) => f.count) ?? [1]));
  const trafficChart = (data?.trafficByDay ?? []).map((d) => ({
    label: d.day,
    value: d.pageViews,
    secondary: d.purchases,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Link
              href="/admin/load-test"
              className="rounded-lg bg-nav px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Run load test
            </Link>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <Link href="/admin/orders" className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">All orders</Link>
        <Link href="/admin/orders?country=US" className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">US</Link>
        <Link href="/admin/orders?country=GB" className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">UK</Link>
        <Link href="/admin/orders?country=IN" className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">India</Link>
        <Link href="/admin/network?tab=warehouses" className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">Warehouses</Link>
        <Link href="/admin/network?tab=vendors" className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">Vendors</Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading analytics…</p>
      ) : error ? (
        <p className="text-red-600 text-sm mb-6">{error}</p>
      ) : (
        <>
          <div className="mb-8">
            <SalesReportPanel compact />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Page views" value={(data?.totals.page_view ?? 0).toLocaleString()} />
            <KpiCard label="Product views" value={(data?.totals.product_view ?? 0).toLocaleString()} />
            <KpiCard label="Purchases" value={(data?.totals.purchase ?? 0).toLocaleString()} />
            <KpiCard
              label="Conversion"
              value={`${((data?.conversionRate ?? 0) * 100).toFixed(1)}%`}
              sub="purchases / page views"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <section className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold mb-1">Traffic ({days}d)</h2>
              <p className="text-xs text-slate-500 mb-4">Daily page views and purchases</p>
              <BarChart data={trafficChart} showSecondary height={180} />
              <ChartLegend
                items={[
                  { color: "#183a68", label: "Page views" },
                  { color: "#16a34a", label: "Purchases" },
                ]}
              />
            </section>

            <section className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold mb-1">Page views trend</h2>
              <p className="text-xs text-slate-500 mb-4">Visitor traffic over time</p>
              <AreaChart
                data={(data?.trafficByDay ?? []).map((d) => ({ label: d.day, value: d.pageViews }))}
                height={180}
              />
            </section>

            <section className="bg-white border rounded-xl p-5 lg:col-span-2">
              <h2 className="font-semibold mb-4">Conversion funnel</h2>
              <div className="space-y-2">
                {(data?.funnel ?? []).map((f) => (
                  <div key={f.type}>
                    <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                      <span>{FUNNEL_LABELS[f.type] ?? f.type}</span>
                      <span>{f.count.toLocaleString()}</span>
                    </div>
                    <div className="h-5 bg-slate-100 rounded">
                      <div
                        className="h-5 bg-accent rounded transition-all"
                        style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/admin/orders", title: "Orders", desc: "Fulfill & track orders" },
          { href: "/admin/analytics", title: "Analytics", desc: "Top products & searches" },
          { href: "/admin/boost-sales", title: "Boost Sales", desc: "Leads, carts & coupons" },
          { href: "/admin/products", title: "Products", desc: "Add, edit, bulk upload" },
          { href: "/admin/categories", title: "Categories", desc: "Organize catalog" },
          { href: "/admin/expense-settlement", title: "Expense & Settlement", desc: "Expenses & settlements" },
          { href: "/admin/blog-images", title: "Blog Images", desc: "Hero images per article" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition bg-white"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
