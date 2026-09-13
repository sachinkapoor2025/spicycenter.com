"use client";

import Link from "next/link";
import { formatOrderStatusLabel, type Order } from "@spicycorner/shared";
import { carrierTrackingUrl } from "@/lib/tracking-url";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  accepted: "bg-cyan-100 text-cyan-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  complete: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-slate-100 text-slate-600",
  refunded: "bg-red-100 text-red-700",
};

export function AccountOrdersPanel({
  orders,
  loading,
}: {
  orders: Order[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-slate-500 text-sm py-6">Loading your orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-600 mb-4">You have not placed any orders yet.</p>
        <Link href="/products" className="text-nav font-semibold hover:underline">
          Start shopping →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {orders.map((order) => {
        const statusClass = STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-700";
        return (
          <article
            key={order.orderId}
            className="rounded-lg border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  Order #{order.orderNumber ?? order.orderId.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusClass}`}>
                    {formatOrderStatusLabel(order.status)}
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-nav text-lg">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: order.currency,
                  }).format(order.total)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {order.trackingNumber && (
              <p className="text-sm text-slate-600 mt-3">
                Tracking: <span className="font-mono">{order.trackingNumber}</span>
                {order.carrier ? ` · ${order.carrier}` : ""}
                {" · "}
                <a
                  href={carrierTrackingUrl(order.trackingNumber, order.carrier)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-nav hover:underline"
                >
                  Track package
                </a>
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/orders/${order.orderId}`}
                className="text-sm font-medium text-nav hover:underline"
              >
                View order details
              </Link>
              {order.shippingAddress && (
                <span className="text-sm text-slate-500">
                  Ship to {order.shippingAddress.city}, {order.shippingAddress.state}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
