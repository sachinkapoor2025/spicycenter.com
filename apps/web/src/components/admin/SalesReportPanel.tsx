"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import {
  type SalesPeriod,
  type SalesPeriodReport,
  type SalesReportResponse,
} from "@spicycorner/shared";
import { AreaChart } from "@/components/admin/Charts";
import { downloadCsv, formatMoney } from "@/lib/admin-utils";

function formatRevenue(usd: number, inr: number) {
  const parts: string[] = [];
  if (usd > 0) parts.push(formatMoney(usd, "USD"));
  if (inr > 0) parts.push(formatMoney(inr, "INR"));
  return parts.length ? parts.join(" + ") : formatMoney(0, "USD");
}

function downloadSalesExcel(period: SalesPeriodReport) {
  downloadCsv(
    `spicycorner-sales-${period.period}-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      ["SpicyCenter Sales Report"],
      ["Period", period.label],
      ["From", period.from],
      ["To", period.to],
      ["Orders (paid)", String(period.orderCount)],
      ["Revenue USD", period.revenueUSD.toFixed(2)],
      ["Revenue INR", period.revenueINR.toFixed(2)],
      ["Excluded refunds", String(period.excluded.refunded)],
      ["Excluded cancelled", String(period.excluded.cancelled)],
      ["Excluded pending payment", String(period.excluded.pendingPayment)],
      [],
      ["Date", "Orders", "Revenue USD", "Revenue INR"],
      ...period.breakdown.map((b) => [
        b.date,
        String(b.orderCount),
        b.revenueUSD.toFixed(2),
        b.revenueINR.toFixed(2),
      ]),
      [],
      ["Order ID", "Paid at", "Customer", "Email", "Total", "Currency", "Status", "Payment", "Items"],
      ...period.orders.map((o) => [
        o.orderId,
        o.paidAt,
        o.customerName,
        o.email,
        o.total.toFixed(2),
        o.currency,
        o.status,
        o.paymentProvider ?? "",
        String(o.itemCount),
      ]),
    ]
  );
}

function SalesReportPrintView({ period }: { period: SalesPeriodReport }) {
  return (
    <div className="p-8 text-sm text-black bg-white">
      <p className="text-2xl font-bold mb-1">SpicyCenter — Sales Report</p>
      <p className="text-slate-600 mb-4">{period.label}</p>
      <p className="text-xs text-slate-500 mb-6">
        {new Date(period.from).toLocaleString()} — {new Date(period.to).toLocaleString()}
      </p>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border p-3 rounded">
          <p className="text-xs uppercase text-slate-500">Paid orders</p>
          <p className="text-xl font-bold">{period.orderCount}</p>
        </div>
        <div className="border p-3 rounded">
          <p className="text-xs uppercase text-slate-500">Revenue USD</p>
          <p className="text-xl font-bold">{formatMoney(period.revenueUSD, "USD")}</p>
        </div>
        <div className="border p-3 rounded">
          <p className="text-xs uppercase text-slate-500">Revenue INR</p>
          <p className="text-xl font-bold">{formatMoney(period.revenueINR, "INR")}</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Excludes refunds ({period.excluded.refunded}), cancelled ({period.excluded.cancelled}), and
        unpaid ({period.excluded.pendingPayment}) orders.
      </p>
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Order</th>
            <th className="text-left py-2">Paid</th>
            <th className="text-left py-2">Customer</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {period.orders.map((o) => (
            <tr key={o.orderId} className="border-b">
              <td className="py-1.5 font-mono">{o.orderId.slice(0, 8)}…</td>
              <td className="py-1.5">{new Date(o.paidAt).toLocaleDateString()}</td>
              <td className="py-1.5">{o.customerName}</td>
              <td className="py-1.5 text-right">{formatMoney(o.total, o.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SalesReportPanelProps = {
  compact?: boolean;
};

export function SalesReportPanel({ compact = false }: SalesReportPanelProps) {
  const apiClient = useApiClient();
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [period, setPeriod] = useState<SalesPeriod>("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    apiClient<SalesReportResponse>("/admin/analytics/sales")
      .then(setReport)
      .catch((err) => {
        setReport(null);
        setError(err instanceof Error ? err.message : "Could not load sales report");
      })
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const active = report?.[period];

  const downloadPdf = () => {
    if (!active) return;
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Sales Report</title>
      <style>body{font-family:system-ui,sans-serif;margin:0} table{width:100%}</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const summaryCards = report ? (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {(["day", "week", "month"] as SalesPeriod[]).map((p) => {
        const data = report[p];
        const selected = period === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`text-left rounded-xl border p-4 transition ${
              selected ? "border-nav bg-nav/5 ring-2 ring-nav/20" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{data.label}</p>
            <p className="text-lg font-bold mt-1">{formatRevenue(data.revenueUSD, data.revenueINR)}</p>
            <p className="text-xs text-slate-500 mt-1">{data.orderCount} paid orders</p>
          </button>
        );
      })}
    </div>
  ) : null;

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading sales report…</p>;
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  if (!active) return null;

  return (
    <section className="bg-white border rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-lg">Sales &amp; payments received</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Paid orders only — refunds, cancelled, and unpaid orders excluded
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadSalesExcel(active)}
            className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            className="text-sm bg-nav text-white px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            Download PDF
          </button>
        </div>
      </div>

      {summaryCards}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-green-50 border border-green-100 p-3">
          <p className="text-xs text-green-800 uppercase">Paid orders</p>
          <p className="text-2xl font-bold text-green-900">{active.orderCount}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border p-3">
          <p className="text-xs text-slate-500 uppercase">Revenue USD</p>
          <p className="text-xl font-bold">{formatMoney(active.revenueUSD, "USD")}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border p-3">
          <p className="text-xs text-slate-500 uppercase">Revenue INR</p>
          <p className="text-xl font-bold">{formatMoney(active.revenueINR, "INR")}</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs text-amber-800 uppercase">Excluded</p>
          <p className="text-sm font-medium text-amber-900 mt-1">
            {active.excluded.refunded} refunds · {active.excluded.cancelled} cancelled
          </p>
        </div>
      </div>

      {active.breakdown.length > 0 && !compact && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-2">Daily revenue ({active.label})</h3>
          <AreaChart
            data={active.breakdown.map((b) => ({
              label: b.date.slice(5),
              value: b.revenueUSD + b.revenueINR,
            }))}
            height={140}
          />
        </div>
      )}

      {!compact && active.orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left text-xs text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Paid</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {active.orders.slice(0, 50).map((o) => (
                <tr key={o.orderId} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs">{o.orderId.slice(0, 8)}…</td>
                  <td className="py-2 pr-3 text-xs">{new Date(o.paidAt).toLocaleString()}</td>
                  <td className="py-2 pr-3">{o.customerName}</td>
                  <td className="py-2 pr-3 capitalize text-xs">{o.paymentProvider ?? "—"}</td>
                  <td className="py-2 text-right font-medium">{formatMoney(o.total, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {active.orders.length > 50 && (
            <p className="text-xs text-slate-500 mt-2">Showing 50 of {active.orders.length} — export for full list</p>
          )}
        </div>
      )}

      <div className="hidden" aria-hidden ref={printRef}>
        <SalesReportPrintView period={active} />
      </div>
    </section>
  );
}
