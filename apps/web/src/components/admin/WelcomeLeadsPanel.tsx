"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import { downloadCsv, paginate, sortItems, type SortDir } from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";
import { formatCouponExpiry } from "@/lib/welcome-coupon";

type WelcomeCouponRow = {
  code: string;
  email?: string;
  phone?: string;
  discountPercent: number;
  expiresAt: string;
  createdAt: string;
  sessionId?: string;
  usedAt?: string;
  orderId?: string;
};

export function WelcomeLeadsPanel() {
  const apiClient = useApiClient();
  const [rows, setRows] = useState<WelcomeCouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "redeemed" | "expired">("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(() => {
    setLoading(true);
    apiClient<{ coupons: WelcomeCouponRow[] }>("/admin/welcome-coupons")
      .then((d) => setRows(d.coupons ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => !r.usedAt && new Date(r.expiresAt).getTime() > Date.now()).length,
      used: rows.filter((r) => r.usedAt).length,
      redemptionRate: rows.length > 0 ? rows.filter((r) => r.usedAt).length / rows.length : 0,
    }),
    [rows]
  );

  const rowStatus = (r: WelcomeCouponRow): "active" | "redeemed" | "expired" => {
    if (r.usedAt) return "redeemed";
    if (new Date(r.expiresAt).getTime() < Date.now()) return "expired";
    return "active";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusTab !== "all" && rowStatus(r) !== statusTab) return false;
      if (!q) return true;
      const phoneDigits = (r.phone ?? "").replace(/\D/g, "");
      const qDigits = q.replace(/\D/g, "");
      return (
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (qDigits.length >= 4 && phoneDigits.includes(qDigits)) ||
        r.code.toLowerCase().includes(q) ||
        (r.orderId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, statusTab]);

  const sorted = useMemo(
    () => sortItems(filtered, (r) => r.createdAt, sortDir),
    [filtered, sortDir]
  );

  const paged = paginate(sorted, page, pageSize);

  const exportCsv = () => {
    downloadCsv("welcome-phone-leads.csv", [
      ["Mobile", "Email", "Coupon", "Discount %", "Created", "Expires", "Status", "Order ID"],
      ...sorted.map((r) => [
        r.phone ?? "",
        r.email ?? "",
        r.code,
        String(r.discountPercent),
        r.createdAt,
        r.expiresAt,
        r.usedAt ? "Used" : new Date(r.expiresAt).getTime() < Date.now() ? "Expired" : "Active",
        r.orderId ?? "",
      ]),
    ]);
  };

  const statusLabel = (r: WelcomeCouponRow) => {
    if (r.usedAt) return { text: "Redeemed", className: "text-slate-600" };
    if (new Date(r.expiresAt).getTime() < Date.now()) return { text: "Expired", className: "text-red-600" };
    return { text: "Active", className: "text-green-700" };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Welcome Leads</h2>
          <p className="text-sm text-slate-600 mt-1">
            Spin-the-wheel signups (mystery 6–10% off, 1-hour validity, one spin per mobile per day).
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-white"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase">Total signups</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase">Active coupons</p>
          <p className="text-2xl font-bold text-green-700">{summary.active}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase">Redeemed</p>
          <p className="text-2xl font-bold">{summary.used}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase">Redemption rate</p>
          <p className="text-2xl font-bold">{(summary.redemptionRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "active" as const, label: "Active" },
            { id: "redeemed" as const, label: "Redeemed" },
            { id: "expired" as const, label: "Expired" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setStatusTab(t.id);
              setPage(1);
            }}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              statusTab === t.id
                ? "bg-nav text-white border-nav"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search mobile, email, or coupon…"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
      </div>

      <TableControls
        page={paged.page}
        totalPages={paged.totalPages}
        total={sorted.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        sortLabel="Date"
        sortDir={sortDir}
        onSortToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        onExport={exportCsv}
      />

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Coupon</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Order</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : paged.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No welcome signups yet.
                </td>
              </tr>
            ) : (
              paged.items.map((r) => {
                const status = statusLabel(r);
                return (
                  <tr key={`${r.code}-${r.createdAt}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {r.phone ? (
                        <a href={`tel:${r.phone}`} className="text-nav hover:underline">
                          {r.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.email ? (
                        <Link
                          href={`/admin/customers/${encodeURIComponent(r.email)}`}
                          className="text-nav hover:underline"
                        >
                          {r.email}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{r.code}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCouponExpiry(r.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCouponExpiry(r.expiresAt)}</td>
                    <td className={`px-4 py-3 font-medium ${status.className}`}>{status.text}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.orderId ? (
                        <Link href={`/admin/orders/${r.orderId}`} className="text-nav hover:underline">
                          {r.orderId.slice(0, 8)}…
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
