"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import { formatMoney } from "@/lib/admin-utils";
import { statusLabel as orderStatusLabel, badgeClass } from "@/lib/order-status";

type CustomerProfileResponse = {
  customer: {
    email: string;
    name: string | null;
    phone: string | null;
    orderCount: number;
    lifetimeValueByCurrency: Record<string, number>;
    lastActivity: string | null;
  };
  orders: {
    orderId: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    trackingNumber?: string;
  }[];
  leads: {
    source?: string;
    page?: string;
    status?: string;
    notes?: string;
    assignedTo?: string;
    createdAt: string;
  }[];
  abandonedCarts: {
    sessionId: string;
    value: number;
    currency?: string;
    itemCount: number;
    updatedAt: string;
    converted: boolean;
    convertedOrderId?: string;
  }[];
  welcomeCoupons: {
    code: string;
    discountPercent: number;
    expiresAt: string;
    usedAt?: string;
    orderId?: string;
    createdAt: string;
  }[];
  sessions: {
    sessionId: string;
    firstSeen: string;
    lastSeen: string;
    eventCount: number;
    landingPage?: string;
    exitPage?: string;
  }[];
};

export default function AdminCustomerProfilePage() {
  const params = useParams();
  const emailParam = decodeURIComponent(String(params.email ?? ""));
  const apiClient = useApiClient();
  const [data, setData] = useState<CustomerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!emailParam) return;
    setLoading(true);
    setError("");
    apiClient<CustomerProfileResponse>(`/admin/customers/${encodeURIComponent(emailParam)}`)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load customer");
      })
      .finally(() => setLoading(false));
  }, [apiClient, emailParam]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-slate-500">Loading customer profile…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/admin/visitors" className="text-sm text-nav hover:underline">
          ← Back
        </Link>
        <p className="text-red-600 mt-4">{error || "Customer not found"}</p>
      </div>
    );
  }

  const { customer } = data;
  const ltv = Object.entries(customer.lifetimeValueByCurrency);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link href="/admin/visitors" className="text-sm text-nav hover:underline">
        ← Visitors
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold text-primary">{customer.name || customer.email}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {customer.email}
          {customer.phone ? ` · ${customer.phone}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs uppercase text-slate-400">Orders</p>
          <p className="text-2xl font-bold">{customer.orderCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 col-span-2">
          <p className="text-xs uppercase text-slate-400">Lifetime value</p>
          <p className="text-2xl font-bold">
            {ltv.length === 0
              ? "—"
              : ltv.map(([cur, amt]) => formatMoney(amt, cur)).join(" · ")}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs uppercase text-slate-400">Last activity</p>
          <p className="text-sm font-medium mt-1">
            {customer.lastActivity ? new Date(customer.lastActivity).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      <Section title="Orders">
        {data.orders.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Tracking</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.orderId} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/admin/orders/${o.orderId}`} className="text-nav hover:underline font-mono text-xs">
                      {o.orderId.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${badgeClass(o.status)}`}>
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatMoney(o.total, o.currency)}</td>
                  <td className="px-3 py-2 text-xs">{o.trackingNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Abandoned carts">
        {data.abandonedCarts.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Converted</th>
              </tr>
            </thead>
            <tbody>
              {data.abandonedCarts.map((c) => (
                <tr key={c.sessionId} className="border-t">
                  <td className="px-3 py-2">{formatMoney(c.value, c.currency ?? "USD")}</td>
                  <td className="px-3 py-2">{c.itemCount}</td>
                  <td className="px-3 py-2 text-xs">{new Date(c.updatedAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.converted && c.convertedOrderId ? (
                      <Link href={`/admin/orders/${c.convertedOrderId}`} className="text-nav hover:underline">
                        {c.convertedOrderId.slice(0, 8)}…
                      </Link>
                    ) : (
                      "No"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Lead touchpoints">
        {data.leads.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Assigned</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{l.source ?? "—"}</td>
                  <td className="px-3 py-2 text-xs break-all">{l.page ?? "—"}</td>
                  <td className="px-3 py-2">{l.status ?? "—"}</td>
                  <td className="px-3 py-2">{l.assignedTo ?? "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px] truncate">{l.notes ?? "—"}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Welcome coupons">
        {data.welcomeCoupons.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Discount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.welcomeCoupons.map((c) => (
                <tr key={c.code} className="border-t">
                  <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                  <td className="px-3 py-2">{c.discountPercent}%</td>
                  <td className="px-3 py-2">
                    {c.usedAt
                      ? "Redeemed"
                      : new Date(c.expiresAt).getTime() < Date.now()
                        ? "Expired"
                        : "Active"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.orderId ? (
                      <Link href={`/admin/orders/${c.orderId}`} className="text-nav hover:underline">
                        {c.orderId.slice(0, 8)}…
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Visitor sessions">
        {data.sessions.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Landing</th>
                <th className="px-3 py-2">Exit</th>
                <th className="px-3 py-2">Events</th>
                <th className="px-3 py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions
                .slice()
                .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
                .map((s) => (
                  <tr key={s.sessionId} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{s.sessionId.slice(0, 10)}…</td>
                    <td className="px-3 py-2 text-xs break-all">{s.landingPage ?? "—"}</td>
                    <td className="px-3 py-2 text-xs break-all">{s.exitPage ?? "—"}</td>
                    <td className="px-3 py-2">{s.eventCount}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {s.lastSeen ? new Date(s.lastSeen).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="bg-white border rounded-lg overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="px-4 py-6 text-sm text-slate-500">None recorded.</p>;
}
