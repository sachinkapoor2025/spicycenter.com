"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import {
  ORDER_STATUS,
  orderHasVendor,
  orderVendorKeys,
  vendorDisplayLabel,
  VENDOR_ORANGE_COUNTY,
  VENDOR_SPICYCORNER,
  ensureVendorFulfillments,
  type VendorFulfillment,
} from "@spicycorner/shared";
import { statusLabel, badgeClass } from "@/lib/order-status";
import {
  downloadCsv,
  formatMoney,
  matchesOrderStatusTab,
  matchesPaymentFilter,
  paginate,
  paymentStatusClass,
  paymentStatusLabel,
  shippingStatusLabel,
  sortItems,
  type SortDir,
} from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";

interface Order {
  orderId: string;
  /** Human-readable OC##### / US##### when assigned. */
  orderNumber?: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  carrier?: string;
  paymentProvider?: string;
  shippingAddress: { name: string; email: string; phone?: string; country?: string };
  assignedWarehouseId?: string;
  fulfillmentCountry?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  labelStatus?: "none" | "queued" | "purchased" | "failed";
  shippingServiceName?: string;
  /** Set at checkout when cart has vendor-sourced lines (e.g. orange-county). */
  vendorSlugs?: string[];
  vendorFulfillments?: VendorFulfillment[];
  items?: { vendorSlug?: string; sku?: string; name?: string }[];
}

function vendorFilterLabel(slug: string): string {
  return vendorDisplayLabel(slug);
}

function collectVendorSlugs(orders: Order[]): string[] {
  const set = new Set<string>();
  for (const o of orders) {
    for (const s of orderVendorKeys(o)) set.add(s);
  }
  set.add(VENDOR_ORANGE_COUNTY);
  set.add(VENDOR_SPICYCORNER);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function VendorBadges({ order }: { order: Order }) {
  const keys = orderVendorKeys(order);
  return (
    <div className="flex flex-col gap-1">
      {keys.map((slug) => (
        <span
          key={slug}
          className={
            slug === VENDOR_ORANGE_COUNTY
              ? "inline-flex w-fit items-center rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-[11px] font-semibold"
              : "inline-flex w-fit items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold"
          }
        >
          {vendorDisplayLabel(slug)}
        </span>
      ))}
    </div>
  );
}

function abbreviateServiceName(name?: string): string | null {
  if (!name) return null;
  const trimmed = name.replace(/^USPS\s+/i, "").trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 16)}…`;
}

type SortKey = "date" | "amount" | "status" | "customer";

const STATUS_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: ORDER_STATUS.PENDING_PAYMENT, label: "Pending payment" },
  { id: ORDER_STATUS.PAID, label: "Paid" },
  { id: ORDER_STATUS.ON_HOLD, label: "On hold" },
  { id: ORDER_STATUS.PROCESSING, label: "Processing" },
  { id: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { id: ORDER_STATUS.DELIVERED, label: "Delivered" },
  { id: ORDER_STATUS.CANCELLED, label: "Cancelled" },
  { id: ORDER_STATUS.REFUNDED, label: "Refunded" },
];

const PAYMENT_FILTERS = [
  { id: "all", label: "All payments" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "failed", label: "Failed / Cancelled" },
  { id: "refunded", label: "Refunded" },
];

function AdminOrdersPageInner() {
  const apiClient = useApiClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState(searchParams.get("country")?.toUpperCase() || "all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadOrders = useCallback(() => {
    setLoading(true);
    apiClient<{ orders: Order[] }>("/admin/orders")
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [tab, paymentFilter, paymentMethod, vendorFilter, countryFilter, search, dateFrom, dateTo, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (!matchesOrderStatusTab(o.status, tab)) return false;
      if (!matchesPaymentFilter(o.status, paymentFilter)) return false;
      if (paymentMethod !== "all" && o.paymentProvider !== paymentMethod) return false;
      if (vendorFilter !== "all" && !orderHasVendor(o, vendorFilter)) {
        return false;
      }
      if (countryFilter !== "all") {
        const c = (o.fulfillmentCountry ?? o.shippingAddress?.country ?? "").toUpperCase();
        if (c !== countryFilter) return false;
      }
      if (dateFrom && o.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && o.createdAt.slice(0, 10) > dateTo) return false;
      if (!q) return true;
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.shippingAddress?.name?.toLowerCase().includes(q) ||
        o.shippingAddress?.email?.toLowerCase().includes(q) ||
        o.shippingAddress?.phone?.toLowerCase().includes(q)
      );
    });

    const sorter =
      sortKey === "amount"
        ? (o: Order) => o.total
        : sortKey === "status"
          ? (o: Order) => o.status
          : sortKey === "customer"
            ? (o: Order) => o.shippingAddress?.name ?? ""
            : (o: Order) => o.createdAt;

    list = sortItems(list, sorter, sortDir);
    return list;
  }, [orders, tab, paymentFilter, paymentMethod, vendorFilter, countryFilter, search, dateFrom, dateTo, sortKey, sortDir]);

  const vendorOptions = useMemo(() => collectVendorSlugs(orders), [orders]);

  const { items: pageItems, totalPages, total } = paginate(filtered, page, pageSize);

  const toggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const cycleSortKey = () => {
    const keys: SortKey[] = ["date", "amount", "status", "customer"];
    const idx = keys.indexOf(sortKey);
    setSortKey(keys[(idx + 1) % keys.length]);
  };

  const exportOrders = () => {
    const rows = [
      [
        "Order ID",
        "Date",
        "Customer",
        "Email",
        "Phone",
        "Order Status",
        "Payment Status",
        "Payment Method",
        "Shipping Status",
        "Total",
        "Currency",
        "Tracking",
        "Vendor",
        "Last Updated",
      ],
      ...filtered.map((o) => [
        o.orderId,
        o.createdAt,
        o.shippingAddress?.name ?? "",
        o.shippingAddress?.email ?? "",
        o.shippingAddress?.phone ?? "",
        statusLabel(o.status),
        paymentStatusLabel(o.status),
        o.paymentProvider ?? "",
        shippingStatusLabel(o.status),
        String(o.total),
        o.currency,
        ensureVendorFulfillments(o)
          .map((f) =>
            f.trackingNumber
              ? `${vendorDisplayLabel(f.vendorSlug)}:${f.trackingNumber}`
              : ""
          )
          .filter(Boolean)
          .join(" | ") ||
          o.trackingNumber ||
          "",
        orderVendorKeys(o).join("+"),
        o.updatedAt,
      ]),
    ];
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkExport = () => {
    const subset = filtered.filter((o) => selected.has(o.orderId));
    if (!subset.length) return;
    const rows = [
      ["Order ID", "Customer", "Email", "Total", "Currency", "Status"],
      ...subset.map((o) => [
        o.orderId,
        o.shippingAddress?.name ?? "",
        o.shippingAddress?.email ?? "",
        String(o.total),
        o.currency,
        o.status,
      ]),
    ];
    downloadCsv(`orders-selected-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const sortLabels: Record<SortKey, string> = {
    date: "Date",
    amount: "Amount",
    status: "Status",
    customer: "Customer",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button
          type="button"
          onClick={loadOrders}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPaymentFilter("all");
            }}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              tab === t.id
                ? "bg-nav text-white border-nav"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <input
          type="search"
          placeholder="Search order ID, name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          {PAYMENT_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All payment methods</option>
          <option value="stripe">Stripe</option>
          <option value="razorpay">Razorpay</option>
        </select>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          title="Filter by fulfillment country"
        >
          <option value="all">All countries</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="IN">India</option>
          <option value="CA">Canada</option>
          <option value="AU">Australia</option>
          <option value="AE">UAE</option>
        </select>
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          title="Filter by fulfillment vendor"
        >
          <option value="all">All vendors</option>
          <option value="spicycorner">SpicyCorner</option>
          {vendorOptions.map((slug) => (
            <option key={slug} value={slug}>
              {vendorFilterLabel(slug)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm"
            title="To date"
          />
        </div>
      </div>

      <TableControls
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortLabel={sortLabels[sortKey]}
        sortDir={sortDir}
        onSortToggle={() => {
          cycleSortKey();
          toggleSort();
        }}
        onExport={exportOrders}
      >
        {selected.size > 0 && (
          <>
            <button
              type="button"
              onClick={bulkExport}
              className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg"
            >
              Export {selected.size} selected
            </button>
          </>
        )}
      </TableControls>

      {loading ? (
        <p className="text-slate-500">Loading orders…</p>
      ) : pageItems.length === 0 ? (
        <p className="text-slate-600">No orders found.</p>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={pageItems.every((o) => selected.has(o.orderId))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set([...selected, ...pageItems.map((o) => o.orderId)]));
                      } else {
                        setSelected(
                          new Set([...selected].filter((id) => !pageItems.some((o) => o.orderId === id)))
                        );
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">Date & time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Order status</th>
                <th className="py-3 px-3">Shipping</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Updated</th>
                <th className="py-3 px-3">Age</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => {
                const hoursSinceUpdate =
                  (Date.now() - new Date(o.updatedAt || o.createdAt).getTime()) / (1000 * 60 * 60);
                const isStale =
                  hoursSinceUpdate >= 48 &&
                  (o.status === ORDER_STATUS.PENDING_PAYMENT || o.status === ORDER_STATUS.PROCESSING);
                return (
                <tr
                  key={o.orderId}
                  className={`border-t hover:bg-blue-50/40 align-top ${
                    isStale ? "bg-amber-50/80" : ""
                  }`}
                >
                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(o.orderId)}
                      onChange={() => toggleSelect(o.orderId)}
                    />
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${o.orderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nav hover:underline"
                    >
                      {o.orderNumber ?? `${o.orderId.slice(0, 8)}…`}
                    </Link>
                  </td>
                  <td
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.orderId}`)}
                  >
                    <VendorBadges order={o} />
                  </td>
                  <td
                    className="py-3 px-3 text-slate-500 whitespace-nowrap cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.orderId}`)}
                  >
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.orderId}`)}
                  >
                    <div className="font-medium">{o.shippingAddress?.name ?? "—"}</div>
                    <div className="text-xs text-slate-400">
                      {o.shippingAddress?.email ? (
                        <Link
                          href={`/admin/customers/${encodeURIComponent(o.shippingAddress.email)}`}
                          className="text-nav hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {o.shippingAddress.email}
                        </Link>
                      ) : (
                        ""
                      )}
                    </div>
                    {o.shippingAddress?.phone && (
                      <div className="text-xs text-slate-400">{o.shippingAddress.phone}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusClass(o.status)}`}
                    >
                      {paymentStatusLabel(o.status)}
                    </span>
                    <div className="text-xs text-slate-400 mt-1 capitalize">
                      {o.paymentProvider ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600">
                    <div>{shippingStatusLabel(o.status)}</div>
                    {o.labelStatus === "failed" && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                        Label failed
                      </span>
                    )}
                    {abbreviateServiceName(o.shippingServiceName) && (
                      <div className="text-slate-400 truncate max-w-[120px]" title={o.shippingServiceName}>
                        {abbreviateServiceName(o.shippingServiceName)}
                      </div>
                    )}
                    {ensureVendorFulfillments(o).some((f) => f.trackingNumber) ? (
                      <div className="mt-1 space-y-0.5">
                        {ensureVendorFulfillments(o)
                          .filter((f) => f.trackingNumber)
                          .map((f) => (
                            <div
                              key={f.vendorSlug}
                              className="text-slate-400 truncate max-w-[140px]"
                              title={`${vendorDisplayLabel(f.vendorSlug)}: ${f.trackingNumber}`}
                            >
                              {vendorDisplayLabel(f.vendorSlug).slice(0, 2)}: {f.trackingNumber}
                            </div>
                          ))}
                      </div>
                    ) : o.trackingNumber ? (
                      <div className="text-slate-400 truncate max-w-[100px]" title={o.trackingNumber}>
                        {o.trackingNumber}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 px-3 font-medium whitespace-nowrap">
                    {formatMoney(o.total, o.currency)}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(o.updatedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-xs whitespace-nowrap">
                    {isStale ? (
                      <span className="text-amber-700 font-medium" title="No update in 48+ hours">
                        {Math.floor(hoursSinceUpdate / 24)}d stale
                      </span>
                    ) : (
                      <span className="text-slate-400">{Math.floor(hoursSinceUpdate / 24)}d</span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading orders…</p>}>
      <AdminOrdersPageInner />
    </Suspense>
  );
}
