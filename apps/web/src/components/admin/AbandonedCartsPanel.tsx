"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import { downloadCsv, downloadPdfReport, formatDurationMs, formatMoney } from "@/lib/admin-utils";

interface CartItem {
  productSlug: string;
  name: string;
  quantity: number;
  price: number;
  currency?: string;
}

interface AbandonedCart {
  userKey: string;
  sessionId?: string;
  itemCount: number;
  value: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  name?: string;
  email?: string;
  phone?: string;
  abandonedEmail1SentAt?: string;
  abandonedEmail2SentAt?: string;
  recoveryCouponCode?: string;
  convertedOrderId?: string;
  converted: boolean;
}

function recoveryStatus(c: AbandonedCart): string {
  if (c.converted) return "Converted to order";
  if (c.abandonedEmail2SentAt) return "2 recovery emails sent";
  if (c.abandonedEmail1SentAt) return "1 recovery email sent";
  return "Not emailed yet";
}

export function AbandonedCartsPanel() {
  const apiClient = useApiClient();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewCart, setViewCart] = useState<AbandonedCart | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient<{ carts: AbandonedCart[] }>("/admin/carts/abandoned")
      .then((d) => setCarts(d.carts))
      .catch(() => setCarts([]))
      .finally(() => setLoading(false));
  }, [apiClient]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return carts;
    return carts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [carts, search]);

  const totalValue = useMemo(() => filtered.reduce((sum, c) => sum + c.value, 0), [filtered]);

  const exportCsv = () => {
    downloadCsv(
      `abandoned-carts-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [
          "Name",
          "Email",
          "Phone",
          "Created at",
          "Last activity",
          "Items",
          "Quantity",
          "Value",
          "Currency",
          "Recovery status",
          "Coupon",
          "Converted",
          "Order ID",
        ],
        ...filtered.map((c) => [
          c.name ?? "",
          c.email ?? "",
          c.phone ?? "",
          c.createdAt,
          c.updatedAt,
          c.items.map((i) => `${i.quantity}x ${i.name}`).join("; "),
          String(c.itemCount),
          c.value.toFixed(2),
          c.currency ?? "USD",
          recoveryStatus(c),
          c.recoveryCouponCode ?? "",
          c.converted ? "Yes" : "No",
          c.convertedOrderId ?? "",
        ]),
      ]
    );
  };

  const exportPdf = () => {
    const rows = filtered
      .map(
        (c) =>
          `<tr><td>${c.name ?? "Guest"}</td><td>${c.email ?? ""}</td><td>${formatMoney(c.value, c.currency ?? "USD")}</td><td>${new Date(c.createdAt).toLocaleString()}</td><td>${recoveryStatus(c)}</td><td>${c.convertedOrderId ?? "—"}</td></tr>`
      )
      .join("");
    downloadPdfReport(
      "Abandoned carts",
      `<h1>Abandoned carts</h1><p>${filtered.length} carts · ${formatMoney(totalValue, filtered[0]?.currency ?? "USD")} at risk</p>
      <table><thead><tr><th>Customer</th><th>Email</th><th>Value</th><th>Created</th><th>Recovery</th><th>Order</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Abandoned Carts</h2>
        {filtered.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Export Excel
            </button>
            <button
              onClick={exportPdf}
              className="bg-nav text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Export PDF
            </button>
          </div>
        )}
      </div>
      <p className="text-slate-600 text-sm mb-4">
        Automatic recovery emails at 15 min and 4 hr with 10% coupon (4 hr validity).{" "}
        {filtered.length > 0 && (
          <span className="font-medium">
            {filtered.length} carts · {formatMoney(totalValue, filtered[0]?.currency ?? "USD")} at risk
          </span>
        )}
      </p>

      <input
        type="search"
        placeholder="Search name, email, phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 border rounded-lg px-3 py-2 text-sm"
      />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-600">No abandoned carts right now.</p>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Cart value</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Recovery</th>
                <th className="py-3 px-4">Converted</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.userKey} className="border-t align-top">
                  <td className="py-3 px-4">
                    {c.name || c.email || c.phone ? (
                      <div>
                        {c.name && <div className="font-medium">{c.name}</div>}
                        {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                        {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Anonymous guest</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ul className="space-y-0.5">
                      {c.items.slice(0, 2).map((i) => (
                        <li key={i.productSlug} className="text-xs text-slate-600">
                          {i.quantity}× {i.name}
                        </li>
                      ))}
                      {c.items.length > 2 && (
                        <li className="text-xs text-slate-400">+{c.items.length - 2} more</li>
                      )}
                    </ul>
                  </td>
                  <td className="py-3 px-4 font-medium whitespace-nowrap">
                    {formatMoney(c.value, c.currency ?? "USD")}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    <div>{new Date(c.createdAt).toLocaleString()}</div>
                    <div className="text-slate-400">
                      Idle {formatDurationMs(Date.now() - new Date(c.updatedAt).getTime())}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div>{recoveryStatus(c)}</div>
                    {c.recoveryCouponCode && (
                      <div className="text-slate-400 font-mono">{c.recoveryCouponCode}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {c.converted ? (
                      <Link
                        href={`/admin/orders/${c.convertedOrderId}`}
                        className="text-nav hover:underline font-mono"
                      >
                        {c.convertedOrderId?.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setViewCart(c)}
                      className="text-nav hover:underline"
                    >
                      View cart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">Cart details</h2>
              <button type="button" onClick={() => setViewCart(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <dl className="text-sm space-y-2 mb-4">
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd>{viewCart.name ?? viewCart.email ?? "Guest"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd>{new Date(viewCart.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Recovery</dt>
                <dd>{recoveryStatus(viewCart)}</dd>
              </div>
              {viewCart.convertedOrderId && (
                <div>
                  <dt className="text-slate-500">Order</dt>
                  <dd>
                    <Link href={`/admin/orders/${viewCart.convertedOrderId}`} className="text-nav hover:underline">
                      {viewCart.convertedOrderId}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <table className="w-full text-sm border-t">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {viewCart.items.map((i) => (
                  <tr key={i.productSlug} className="border-t">
                    <td className="py-2">{i.name}</td>
                    <td className="py-2 text-right">{i.quantity}</td>
                    <td className="py-2 text-right">
                      {formatMoney(i.price * i.quantity, i.currency ?? viewCart.currency ?? "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-bold">
                  <td colSpan={2} className="py-3 text-right">
                    Total
                  </td>
                  <td className="py-3 text-right">
                    {formatMoney(viewCart.value, viewCart.currency ?? "USD")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
