"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { VendorApiPanel } from "@/components/admin/VendorApiPanel";
import { VendorExpensePanel } from "@/components/admin/VendorExpensePanel";

type VendorTab = "api" | "expense";

function VendorManagementHubInner() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    const t = searchParams.get("tab");
    if (t === "expense" || t === "api") return t;
    // Default: expense for super admins; API for everyone else.
    return "expense" as VendorTab;
  }, [searchParams]);
  const [tab, setTab] = useState<VendorTab>(initial);

  useEffect(() => {
    setTab(initial);
  }, [initial]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin && tab === "expense") {
      setTab("api");
    }
  }, [authLoading, isSuperAdmin, tab]);

  const tabs: { id: VendorTab; label: string; superOnly?: boolean }[] = [
    { id: "expense", label: "Vendor expense management", superOnly: true },
    { id: "api", label: "Vendor API" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            Orange County vendor tools — API console and (super admin) expense / payout tracking.
            CJ wholesale vs store prices live under Vendor Management → CJ Dropshipping → Cost & pricing.
          </p>
        </div>
        <div className="flex flex-col xs:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {tabs
            .filter((t) => !t.superOnly || isSuperAdmin)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`text-sm px-3 py-2.5 sm:py-1.5 rounded-lg border transition-colors text-left sm:text-center ${
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

      {tab === "expense" ? <VendorExpensePanel /> : <VendorApiPanel />}
    </div>
  );
}

export default function VendorManagementHubPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading…</p>}>
      <VendorManagementHubInner />
    </Suspense>
  );
}
