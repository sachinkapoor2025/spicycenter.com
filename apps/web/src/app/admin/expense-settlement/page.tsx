"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ExpensesPanel } from "@/components/admin/ExpensesPanel";
import { SettlementPanel } from "@/components/admin/SettlementPanel";
import { ReconciliationPanel } from "@/components/admin/ReconciliationPanel";

type ExpenseTab = "expense" | "settlement" | "reconciliation";

function parseTab(raw: string | null): ExpenseTab {
  if (raw === "expense" || raw === "settlement" || raw === "reconciliation") return raw;
  // Back-compat query aliases
  if (raw === "expenses") return "expense";
  if (raw === "payment-tracking" || raw === "tracking") return "settlement";
  return "expense";
}

function ExpenseSettlementHubInner() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initial = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const [tab, setTab] = useState<ExpenseTab>(initial);

  useEffect(() => {
    setTab(initial);
  }, [initial]);

  if (authLoading) {
    return <p className="text-slate-500 p-6">Loading…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Super admin only</h1>
        <p className="text-slate-600 text-sm">
          Expense &amp; Settlement is limited to Cognito users in the <code>super-admin</code> group.
        </p>
      </div>
    );
  }

  const tabs: { id: ExpenseTab; label: string }[] = [
    { id: "expense", label: "Expense" },
    { id: "settlement", label: "Settlement" },
    { id: "reconciliation", label: "Reconciliation" },
  ];

  return (
    <div className="min-h-[50vh]">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Expense &amp; Settlement</h1>
            <p className="text-sm text-slate-600 mt-1">
              Business expenses, gateway settlements, and reconciliation — same tools, one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
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
          </div>
        </div>
      </div>

      {tab === "expense" && <ExpensesPanel />}
      {tab === "settlement" && <SettlementPanel />}
      {tab === "reconciliation" && <ReconciliationPanel />}
    </div>
  );
}

export default function ExpenseSettlementHubPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading…</p>}>
      <ExpenseSettlementHubInner />
    </Suspense>
  );
}
