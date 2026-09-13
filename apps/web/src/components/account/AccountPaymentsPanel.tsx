"use client";

import { useState } from "react";
import type { AccountProfile, Order } from "@spicycorner/shared";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/PaymentMethodPicker";
import { updateAccountProfile } from "@/lib/account";

export function AccountPaymentsPanel({
  profile,
  orders,
  token,
  sessionId,
  onRefresh,
}: {
  profile: AccountProfile;
  orders: Order[];
  token: string;
  sessionId: string;
  onRefresh: () => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>(profile.preferredPaymentMethod ?? "razorpay");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recentPayments = orders
    .filter((o) => o.paymentProvider && o.status !== "pending_payment")
    .slice(0, 5);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await updateAccountProfile(token, sessionId, { preferredPaymentMethod: method });
      await onRefresh();
      setMessage("Preferred payment method saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preference");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h3 className="font-semibold text-slate-900 mb-1">Preferred payment method</h3>
        <p className="text-sm text-slate-600 mb-4">
          Choose your default option at checkout. Card details are handled securely by Stripe or Razorpay — we never store card numbers.
        </p>
        <PaymentMethodPicker value={method} onChange={setMethod} />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-2">{message}</p>}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading}
          className="bg-nav text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save preference"}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Recent payments</h3>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-slate-500">No completed payments yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentPayments.map((order) => (
              <li
                key={order.orderId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm border border-slate-100 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800 capitalize">
                    {order.paymentProvider ?? "Payment"}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()} · #{order.orderId.slice(0, 8)}
                  </p>
                </div>
                <p className="font-semibold text-nav">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: order.currency,
                  }).format(order.total)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
