"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PaymentReconciliationSnapshot, LedgerCurrency } from "@spicycorner/shared";
import { useAuth, useApiClient } from "@/lib/auth-context";
import {
  BarChart,
  HorizontalBarChart,
  ChartLegend,
  SettlementExpectedDonut,
} from "@/components/admin/Charts";

function formatMoney(amount: number, currency: LedgerCurrency) {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function Kpi({
  label,
  usd,
  inr,
  hint,
}: {
  label: string;
  usd: number;
  inr: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-bold mt-1">{formatMoney(usd, "USD")}</p>
      <p className="text-sm font-semibold text-slate-700">{formatMoney(inr, "INR")}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function ReconciliationPanel() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const api = useApiClient();
  const [data, setData] = useState<PaymentReconciliationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ reconciliation: PaymentReconciliationSnapshot }>(
        "/admin/payment-reconciliation"
      );
      setData(res.reconciliation);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load reconciliation");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) void load();
  }, [authLoading, isSuperAdmin, load]);

  const barData = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Expected",
        value: data.expectedPayments.USD,
        secondary: data.expectedPayments.INR,
      },
      {
        label: "Settled",
        value: data.recordedSettlements.USD,
        secondary: data.recordedSettlements.INR,
      },
      {
        label: "Pending",
        value: Math.max(0, data.pendingSettlements.USD),
        secondary: Math.max(0, data.pendingSettlements.INR),
      },
      {
        label: "Fees",
        value: data.gatewayCharges.USD,
        secondary: data.gatewayCharges.INR,
      },
    ];
  }, [data]);

  const providerBars = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Stripe (USD)",
        value: data.byProvider.stripe.USD,
        sub: formatMoney(data.byProvider.stripe.USD, "USD"),
      },
      {
        label: "Razorpay (INR)",
        value: data.byProvider.razorpay.INR,
        sub: formatMoney(data.byProvider.razorpay.INR, "INR"),
      },
      {
        label: "Other USD",
        value: data.byProvider.other.USD,
        sub: formatMoney(data.byProvider.other.USD, "USD"),
      },
      {
        label: "Other INR",
        value: data.byProvider.other.INR,
        sub: formatMoney(data.byProvider.other.INR, "INR"),
      },
    ].filter((x) => x.value > 0);
  }, [data]);

  if (authLoading) {
    return <div className="p-10 text-slate-500">Loading…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Super admin only</h1>
        <Link href="/admin" className="text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Reconciliation</h2>
          <p className="text-slate-600 text-sm">
            Expected (paid orders, excluding refunds) vs manually recorded settlements.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/expense-settlement?tab=settlement"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Record settlements
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-nav text-white px-3 py-2 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-slate-500 text-sm mb-4">Loading…</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 mb-4">
            Generated {new Date(data.generatedAt).toLocaleString()} · {data.orderCounts.revenue}{" "}
            paid orders · {data.settlementCount} settlements · excluded refunded{" "}
            {data.orderCounts.refundedExcluded} / pending {data.orderCounts.pendingExcluded}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Kpi
              label="Expected payments"
              usd={data.expectedPayments.USD}
              inr={data.expectedPayments.INR}
              hint="Paid orders (not refunded)"
            />
            <Kpi
              label="Recorded settlements"
              usd={data.recordedSettlements.USD}
              inr={data.recordedSettlements.INR}
              hint="Net amounts in payment tracking"
            />
            <Kpi
              label="Pending settlement"
              usd={data.pendingSettlements.USD}
              inr={data.pendingSettlements.INR}
              hint="Expected − Recorded"
            />
            <Kpi
              label="Gateway charges"
              usd={data.gatewayCharges.USD}
              inr={data.gatewayCharges.INR}
              hint="Sum of optional fees on settlements"
            />
            <Kpi
              label="Net amount received"
              usd={data.netAmountReceived.USD}
              inr={data.netAmountReceived.INR}
              hint="Same as recorded settlements"
            />
            <Kpi
              label="Total Stripe (orders)"
              usd={data.byProvider.stripe.USD}
              inr={data.byProvider.stripe.INR}
            />
            <Kpi
              label="Total Razorpay (orders)"
              usd={data.byProvider.razorpay.USD}
              inr={data.byProvider.razorpay.INR}
            />
            <Kpi
              label="Overall expected"
              usd={data.overallExpected.USD}
              inr={data.overallExpected.INR}
            />
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
              <div>
                <h2 className="font-semibold">Expected vs received by gateway</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Navy = expected (still pending) · Green = received settlements
                </p>
              </div>
              <ChartLegend
                items={[
                  { label: "Expected", color: "#183a68" },
                  { label: "Received", color: "#16a34a" },
                ]}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <SettlementExpectedDonut
                title="Stripe"
                subtitle="USD orders vs Stripe settlements"
                expected={data.byProvider.stripe.USD}
                received={data.settlementsBySource?.stripe?.USD ?? 0}
                currency="USD"
              />
              <SettlementExpectedDonut
                title="Razorpay"
                subtitle="INR orders vs Razorpay settlements"
                expected={data.byProvider.razorpay.INR}
                received={data.settlementsBySource?.razorpay?.INR ?? 0}
                currency="INR"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
            <h2 className="font-semibold mb-1">Expected vs settled vs pending</h2>
            <p className="text-xs text-slate-500 mb-3">
              Primary bars = USD · secondary = INR (scaled independently per series max)
            </p>
            <ChartLegend
              items={[
                { label: "USD", color: "#183a68" },
                { label: "INR", color: "#16a34a" },
              ]}
            />
            <BarChart data={barData} showSecondary height={180} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
            <h2 className="font-semibold mb-3">By payment gateway (order totals)</h2>
            <HorizontalBarChart items={providerBars} />
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium mb-1">Settlement difference</p>
            <p>
              Expected {formatMoney(data.expectedPayments.USD, "USD")} /{" "}
              {formatMoney(data.expectedPayments.INR, "INR")} − Recorded{" "}
              {formatMoney(data.recordedSettlements.USD, "USD")} /{" "}
              {formatMoney(data.recordedSettlements.INR, "INR")} = Pending{" "}
              <strong>
                {formatMoney(data.pendingSettlements.USD, "USD")} /{" "}
                {formatMoney(data.pendingSettlements.INR, "INR")}
              </strong>
            </p>
            <p className="text-xs mt-2 opacity-90">
              Gateway fees are only counted when entered on each settlement (no fixed %).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
