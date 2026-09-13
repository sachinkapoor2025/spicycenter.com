"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WelcomeLeadsPanel } from "@/components/admin/WelcomeLeadsPanel";
import { AbandonedCartsPanel } from "@/components/admin/AbandonedCartsPanel";
import { CouponsPanel } from "@/components/admin/CouponsPanel";
import { LeadsPanel } from "@/components/admin/LeadsPanel";

type BoostTab = "welcome-leads" | "carts" | "coupons" | "leads";

function parseTab(raw: string | null): BoostTab {
  if (raw === "welcome-leads" || raw === "carts" || raw === "coupons" || raw === "leads") {
    return raw;
  }
  return "welcome-leads";
}

function BoostSalesHubInner() {
  const searchParams = useSearchParams();
  const initial = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const [tab, setTab] = useState<BoostTab>(initial);

  useEffect(() => {
    setTab(initial);
  }, [initial]);

  const tabs: { id: BoostTab; label: string }[] = [
    { id: "welcome-leads", label: "Welcome Leads" },
    { id: "carts", label: "Abandoned Carts" },
    { id: "coupons", label: "Coupons" },
    { id: "leads", label: "Leads" },
  ];

  return (
    <div className="min-h-[50vh]">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Boost Sales</h1>
            <p className="text-sm text-slate-600 mt-1">
              Welcome leads, abandoned carts, coupons, and lead outreach — same tools, one place.
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

      {tab === "welcome-leads" && <WelcomeLeadsPanel />}
      {tab === "carts" && <AbandonedCartsPanel />}
      {tab === "coupons" && <CouponsPanel />}
      {tab === "leads" && <LeadsPanel />}
    </div>
  );
}

export default function BoostSalesHubPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading…</p>}>
      <BoostSalesHubInner />
    </Suspense>
  );
}
