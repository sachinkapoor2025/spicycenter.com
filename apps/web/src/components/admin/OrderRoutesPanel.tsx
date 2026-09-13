"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrderRouteListItem } from "@spicycorner/shared";
import { useApiClient } from "@/lib/auth-context";
import { formatMoney, paginate } from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";

function confidenceClass(c: string) {
  switch (c) {
    case "high":
      return "bg-emerald-100 text-emerald-800";
    case "medium":
      return "bg-amber-100 text-amber-900";
    case "low":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function OrderRoutesPanel() {
  const api = useApiClient();
  const [routes, setRoutes] = useState<OrderRouteListItem[]>([]);
  const [bySource, setBySource] = useState<Array<{ source: string; count: number }>>([]);
  const [coverage, setCoverage] = useState<{
    withSnapshot: number;
    fromEvents: number;
    none: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api<{
      routes: OrderRouteListItem[];
      bySource: Array<{ source: string; count: number }>;
      coverage?: { withSnapshot: number; fromEvents: number; none: number };
    }>("/admin/analytics/order-routes")
      .then((res) => {
        setRoutes(res.routes ?? []);
        setBySource(res.bySource ?? []);
        setCoverage(res.coverage ?? null);
      })
      .catch((err) => {
        setRoutes([]);
        setBySource([]);
        setCoverage(null);
        setError(err instanceof Error ? err.message : "Could not load order routes");
      })
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return routes.filter((r) => {
      if (sourceFilter !== "all") {
        const src = (r.lastSource || r.firstSource || "unknown").toLowerCase();
        if (src !== sourceFilter) return false;
      }
      if (!query) return true;
      return (
        r.orderId.toLowerCase().includes(query) ||
        (r.orderNumber ?? "").toLowerCase().includes(query) ||
        (r.customerName ?? "").toLowerCase().includes(query) ||
        (r.customerEmail ?? "").toLowerCase().includes(query) ||
        r.firstTouchLabel.toLowerCase().includes(query) ||
        r.lastTouchLabel.toLowerCase().includes(query) ||
        (r.campaign ?? "").toLowerCase().includes(query) ||
        (r.landingPage ?? "").toLowerCase().includes(query)
      );
    });
  }, [routes, q, sourceFilter]);

  useEffect(() => {
    setPage(1);
  }, [q, sourceFilter]);

  const paged = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  const pageItems = paged.items;
  const totalPages = paged.totalPages;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold">Order routes</h2>
          <p className="text-sm text-slate-600 mt-1">
            First/last touch and campaign for every order. Open detailed route only when you need the
            full journey.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium text-slate-900 mb-1">How attribution works</p>
        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
          <li>
            <strong>New orders</strong> (after Order Route went live) save first/last touch, campaign,
            landing page, and device at checkout — those rows fill in automatically.
          </li>
          <li>
            <strong>Older orders</strong> had no checkout snapshot; we rebuild what we can from
            session analytics (referrer / UTMs in page URLs) while events still exist (~90 days).
          </li>
          <li>
            Rows still showing Unknown usually had no referrer/UTM (privacy browsers, direct typed
            URL) or session events already expired.
          </li>
        </ul>
        {coverage && (
          <p className="mt-2 text-xs text-slate-600">
            Coverage: {coverage.withSnapshot} checkout snapshots · {coverage.fromEvents} from session
            history · {coverage.none} with no usable signal
          </p>
        )}
      </div>

      {bySource.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSourceFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              sourceFilter === "all"
                ? "bg-nav text-white border-nav"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All ({routes.length})
          </button>
          {bySource.slice(0, 12).map((s) => (
            <button
              key={s.source}
              type="button"
              onClick={() => setSourceFilter(s.source)}
              className={`text-xs px-2.5 py-1 rounded-full border capitalize ${
                sourceFilter === s.source
                  ? "bg-nav text-white border-nav"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.source} ({s.count})
            </button>
          ))}
        </div>
      )}

      <div className="mb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order, customer, source, campaign…"
          className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <TableControls
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading order routes…</p>
      ) : pageItems.length === 0 ? (
        <p className="text-slate-500 text-sm">No orders match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 mt-3">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="py-3 px-3">Order</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">First touch</th>
                <th className="py-3 px-3">Last touch</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Landing</th>
                <th className="py-3 px-3">Device</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.orderId} className="border-t border-slate-100 align-top">
                  <td className="py-3 px-3">
                    <Link
                      href={`/admin/orders/${r.orderId}`}
                      className="font-mono text-xs text-nav hover:underline"
                    >
                      {r.orderNumber ?? `${r.orderId.slice(0, 8)}…`}
                    </Link>
                    {r.attributionOrigin === "checkout_snapshot" ? (
                      <p className="text-[10px] text-emerald-700 mt-0.5">Checkout snapshot</p>
                    ) : r.attributionOrigin === "session_events" ? (
                      <p className="text-[10px] text-sky-700 mt-0.5">From session history</p>
                    ) : (
                      <p className="text-[10px] text-amber-700 mt-0.5">No tracking signal</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(r.orderCreatedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium">{r.customerName ?? "—"}</div>
                    <div className="text-xs text-slate-400">{r.customerEmail ?? ""}</div>
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-800 max-w-[9rem]">
                    {r.firstTouchLabel}
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-800 max-w-[9rem]">
                    {r.lastTouchLabel}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-[8rem] truncate" title={r.campaign}>
                    {r.campaign || "—"}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500 max-w-[8rem] truncate" title={r.landingPage}>
                    {r.landingPage || "—"}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500 capitalize">{r.device || "—"}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${confidenceClass(r.confidence)}`}
                    >
                      {r.confidence}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium whitespace-nowrap">
                    {formatMoney(r.total, r.currency)}
                  </td>
                  <td className="py-3 px-3">
                    <Link
                      href={`/admin/orders/${r.orderId}/route`}
                      className="inline-flex rounded-md border border-nav px-2.5 py-1 text-xs font-semibold text-nav hover:bg-blue-50 whitespace-nowrap"
                    >
                      Detailed route
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
