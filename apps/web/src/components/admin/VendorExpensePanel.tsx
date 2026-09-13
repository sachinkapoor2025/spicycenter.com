"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  VENDOR_ORANGE_COUNTY,
  VENDOR_PAYMENT_SLUG_LABELS,
  VENDOR_PAYOUT_METHODS,
  VENDOR_PAYOUT_METHOD_LABELS,
  recordedByLabel,
  type LedgerCurrency,
  type VendorManagementReport,
  type VendorPayoutEntry,
  type VendorPayoutMethod,
  type VendorPaymentSlug,
} from "@spicycorner/shared";
import { useAuth, useApiClient } from "@/lib/auth-context";
import { BarChart, HorizontalBarChart, ChartLegend, AreaChart } from "@/components/admin/Charts";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: LedgerCurrency = "USD") {
  const symbol = currency === "INR" ? "₹" : "$";
  const digits = currency === "INR" ? 0 : 2;
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** USD primary; INR checkout shows `$10.00 (₹950)`. */
function formatSell(row: {
  sellTotalUsd?: number;
  sellTotal?: number;
  sellTotalInr?: number | null;
  currency: LedgerCurrency;
}) {
  const usdAmount = row.sellTotalUsd ?? row.sellTotal ?? 0;
  const usd = formatMoney(usdAmount, "USD");
  if (row.currency === "INR" && row.sellTotalInr != null) {
    return `${usd} (${formatMoney(row.sellTotalInr, "INR")})`;
  }
  return usd;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "delivered":
    case "complete":
      return "bg-green-100 text-green-800";
    case "shipped":
      return "bg-blue-100 text-blue-800";
    case "processing":
    case "accepted":
      return "bg-indigo-100 text-indigo-800";
    case "paid":
      return "bg-emerald-50 text-emerald-800";
    case "pending_payment":
      return "bg-amber-100 text-amber-900";
    case "cancelled":
    case "refunded":
      return "bg-slate-200 text-slate-600";
    case "on_hold":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : tone === "good"
        ? "border-green-200 bg-green-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-bold mt-1 text-primary">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function VendorExpensePanel() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const api = useApiClient();
  const [vendorSlug] = useState<VendorPaymentSlug>(VENDOR_ORANGE_COUNTY);
  const [report, setReport] = useState<VendorManagementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(todayYmd());
  const [paymentMethod, setPaymentMethod] = useState<VendorPayoutMethod>("bank_transfer");
  const [orderIdsText, setOrderIdsText] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ report: VendorManagementReport }>(
        `/admin/vendor-management?vendor=${encodeURIComponent(vendorSlug)}`
      );
      setReport(res.report);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "Failed to load vendor management");
    } finally {
      setLoading(false);
    }
  }, [api, vendorSlug]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) void load();
  }, [authLoading, isSuperAdmin, load]);

  const statusOptions = useMemo(() => {
    const keys = Object.keys(report?.summary.byStatus ?? {}).sort();
    return ["all", ...keys];
  }, [report]);

  const visibleOrders = useMemo(() => {
    if (!report) return [];
    return report.orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [report, statusFilter]);

  const statusBars = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.summary.byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label: label.replace(/_/g, " "),
        value,
        sub: `${value} orders`,
      }));
  }, [report]);

  const moneyBars = useMemo(() => {
    if (!report) return [];
    const s = report.summary;
    return [
      { label: "Sold USD", value: s.soldUsd ?? s.soldByCurrency.USD },
      { label: "Vendor cost", value: s.vendorCostTotal },
      { label: "Paid vendor", value: s.paidToVendor },
      { label: "Profit est.", value: Math.max(0, s.estimatedProfitUsd) },
    ];
  }, [report]);

  const dailyChart = useMemo(() => {
    if (!report) return [];
    return report.daily.map((d) => ({
      label: d.date,
      value: d.vendorCostUsd,
      secondary: d.paidUsd,
    }));
  }, [report]);

  const areaSold = useMemo(() => {
    if (!report) return [];
    return report.daily.map((d) => ({ label: d.date, value: d.sellUsd }));
  }, [report]);

  const createPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      const orderIds = orderIdsText
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean);

      await api("/admin/vendor-payouts", {
        method: "POST",
        body: JSON.stringify({
          vendorSlug,
          amount: value,
          currency: "USD",
          paidDate,
          paymentMethod,
          ...(orderIds.length ? { orderIds } : {}),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      setAmount("");
      setOrderIdsText("");
      setReference("");
      setNotes("");
      setMessage("Vendor payment recorded");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payout");
    } finally {
      setSaving(false);
    }
  };

  const deletePayout = async (payout: VendorPayoutEntry) => {
    if (!confirm(`Delete payout of ${formatMoney(payout.amount)} on ${payout.paidDate}?`)) return;
    setError("");
    try {
      await api(`/admin/vendor-payouts/${payout.payoutId}`, { method: "DELETE" });
      setMessage("Payout deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payout");
    }
  };

  if (authLoading) {
    return <p className="text-slate-500 p-6">Loading…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-medium">Super admin access required.</p>
        <Link href="/admin" className="text-nav text-sm underline mt-2 inline-block">
          Back to admin
        </Link>
      </div>
    );
  }

  const s = report?.summary;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Vendor expense management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Track sell price vs vendor cost, payments to{" "}
            {VENDOR_PAYMENT_SLUG_LABELS[vendorSlug]}, and balances. Website admin API only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm px-3 py-2">
          {message}
        </div>
      )}

      {loading && !report ? (
        <p className="text-slate-500">Loading vendor report…</p>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <Kpi
              label="Paid orders"
              value={String(s.orderCount)}
              hint="Paid → complete only (pending ignored)"
            />
            <Kpi
              label="Sold (USD)"
              value={formatMoney(s.soldUsd ?? s.soldByCurrency.USD)}
              hint={
                (s.soldInr ?? s.soldByCurrency.INR) > 0
                  ? `Includes INR checkouts → USD @ ${s.usdInrRate?.toFixed?.(2) ?? "—"} (INR total ${formatMoney(s.soldInr ?? s.soldByCurrency.INR, "INR")})`
                  : "Cart value: products + shipping"
              }
            />
            <Kpi
              label="Vendor cost (owed)"
              value={formatMoney(s.vendorCostTotal)}
              hint="Wholesale we owe vendor"
            />
            <Kpi label="Paid to vendor" value={formatMoney(s.paidToVendor)} tone="good" />
            <Kpi
              label="Est. profit (USD)"
              value={formatMoney(s.estimatedProfitUsd)}
              hint="Sold USD − vendor cost"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-primary mb-2">Money overview</h2>
              <HorizontalBarChart items={moneyBars} color="#183a68" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-primary mb-2">Orders by status</h2>
              <HorizontalBarChart items={statusBars} color="#d97706" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-primary mb-2">30-day vendor cost vs paid</h2>
              <BarChart data={dailyChart} showSecondary height={160} />
              <ChartLegend
                items={[
                  { label: "Vendor cost", color: "#183a68" },
                  { label: "Paid to vendor", color: "#16a34a" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-primary mb-2">30-day USD retail (vendor lines)</h2>
            <AreaChart data={areaSold} height={140} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <form
              onSubmit={(e) => void createPayout(e)}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <h2 className="font-semibold text-primary">Record payment to vendor</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm block">
                  Amount (USD)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm block">
                  Paid date
                  <input
                    type="date"
                    required
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm block">
                  Method
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as VendorPayoutMethod)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {VENDOR_PAYOUT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {VENDOR_PAYOUT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm block">
                  Reference
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Txn / cheque #"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
              <label className="text-sm block">
                Order numbers (optional — comma or space separated)
                <input
                  type="text"
                  value={orderIdsText}
                  onChange={(e) => setOrderIdsText(e.target.value)}
                  placeholder="OC10015 OC10013"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm block">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-nav text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save payment"}
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
              <h2 className="font-semibold text-primary mb-3">Payout history</h2>
              {!report.payouts.length ? (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Amount</th>
                      <th className="py-2 pr-2">Method</th>
                      <th className="py-2 pr-2">Orders</th>
                      <th className="py-2 pr-2">By</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {report.payouts.map((p) => (
                      <tr key={p.payoutId} className="border-b border-slate-100">
                        <td className="py-2 pr-2 whitespace-nowrap">{p.paidDate}</td>
                        <td className="py-2 pr-2 font-semibold">
                          {formatMoney(p.amount, p.currency)}
                        </td>
                        <td className="py-2 pr-2">
                          {VENDOR_PAYOUT_METHOD_LABELS[p.paymentMethod]}
                        </td>
                        <td className="py-2 pr-2 max-w-[140px] truncate" title={p.orderIds?.join(", ")}>
                          {p.orderIds?.length ? p.orderIds.join(", ") : "—"}
                        </td>
                        <td className="py-2 pr-2">{recordedByLabel(p.createdBy)}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void deletePayout(p)}
                            className="text-red-600 text-xs font-medium hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h2 className="font-semibold text-primary">Vendor orders (paid only)</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  Status
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1"
                  >
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st === "all" ? "All paid statuses" : st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-2">Order</th>
                    <th className="py-2 pr-2">Product</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Sell (cart)</th>
                    <th className="py-2 pr-2">Vendor cost</th>
                    <th className="py-2 pr-2">Profit</th>
                    <th className="py-2 pr-2">Profit %</th>
                    <th className="py-2 pr-2">Tracking</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => {
                    const profitPct =
                      o.profitEstimate != null && o.sellTotalUsd > 0
                        ? (o.profitEstimate / o.sellTotalUsd) * 100
                        : null;
                    return (
                    <tr key={o.orderId} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Link
                          href={`/admin/orders/${o.orderId}`}
                          className="font-semibold text-nav hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                        {o.recipientName && (
                          <p className="text-xs text-slate-500">{o.recipientName}</p>
                        )}
                      </td>
                      <td className="py-2 pr-2 max-w-[220px]">
                        {o.items?.length ? (
                          <ul className="space-y-1">
                            {o.items.map((line, idx) => (
                              <li key={`${o.orderId}-${line.productSlug}-${idx}`} className="text-xs leading-snug">
                                <span className="font-medium text-slate-800 line-clamp-2">
                                  {line.name}
                                </span>
                                <span className="text-slate-500">
                                  {" "}
                                  ×{line.quantity}
                                  {line.productSlug ? (
                                    <>
                                      {" · "}
                                      <Link
                                        href={`/products/${line.productSlug}`}
                                        className="text-nav hover:underline"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        view
                                      </Link>
                                    </>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(o.status)}`}
                        >
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <span className="font-medium">{formatSell(o)}</span>
                        {(o.shippingAllocatedNative ?? 0) > 0 && (
                          <p className="text-[11px] text-slate-500">
                            incl. ship{" "}
                            {o.currency === "INR"
                              ? formatMoney(o.shippingAllocatedNative!, "INR")
                              : formatMoney(o.shippingAllocatedNative!)}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {o.vendorCostTotal == null ? "—" : formatMoney(o.vendorCostTotal)}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {o.profitEstimate == null ? "—" : formatMoney(o.profitEstimate)}
                      </td>
                      <td
                        className={`py-2 pr-2 whitespace-nowrap font-medium ${
                          profitPct == null
                            ? ""
                            : profitPct < 0
                              ? "text-red-600"
                              : profitPct < 28.6
                                ? "text-amber-700"
                                : "text-emerald-700"
                        }`}
                        title="Profit ÷ sell (cart USD)"
                      >
                        {profitPct == null ? "—" : `${profitPct.toFixed(1)}%`}
                      </td>
                      <td className="py-2 pr-2 text-xs max-w-[120px] truncate" title={o.trackingNumber ?? ""}>
                        {o.trackingNumber || "—"}
                      </td>
                      <td className="py-2 text-xs whitespace-nowrap text-slate-500">
                        {o.createdAt.slice(0, 10)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {!visibleOrders.length && (
                <p className="text-sm text-slate-500 mt-3">No orders match filters.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
