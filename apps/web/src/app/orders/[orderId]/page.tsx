"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSessionId } from "@/lib/session";
import { useAuth } from "@/lib/auth-context";
import { trackPurchase } from "@/lib/track";
import { OrderConfirmation } from "@/components/OrderConfirmation";
import { SiteLogoLink } from "@/components/SiteLogo";
import type { Order } from "@spicycorner/shared";

function OrderDetailInner({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const sessionId = useSessionId();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const purchaseTracked = useRef(false);

  const isDev = searchParams.get("dev") === "1";
  const redirectStatus = searchParams.get("redirect_status");

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api<{ order: Order }>(`/orders/${orderId}`, { sessionId, token });
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId, sessionId, token]);

  useEffect(() => {
    if (!order || purchaseTracked.current) return;
    const paid = order.status === "paid" || redirectStatus === "succeeded" || isDev;
    if (!paid) return;
    purchaseTracked.current = true;
    trackPurchase(order.total, {
      orderId: order.orderId,
      provider: order.paymentProvider ?? "unknown",
      currency: order.currency,
    });
  }, [order, redirectStatus, isDev]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4">
        <SiteLogoLink />
        <p className="text-slate-600 animate-pulse">Loading your order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
        <SiteLogoLink className="mb-6" />
        <h1 className="text-2xl font-bold text-primary mb-3">Order not found</h1>
        <p className="text-slate-600 mb-6 max-w-sm">{error || "We couldn't find this order."}</p>
        <Link
          href="/products"
          className="inline-flex rounded-lg bg-primary text-white font-bold px-6 py-3 hover:bg-primary/90 transition"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const paid = order.status === "paid" || redirectStatus === "succeeded" || isDev;

  return <OrderConfirmation order={order} paid={paid} />;
}

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    void params.then((p) => setOrderId(p.orderId));
  }, [params]);

  if (!orderId) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-600">Loading…</div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-slate-600">Loading…</div>
      }
    >
      <OrderDetailInner orderId={orderId} />
    </Suspense>
  );
}
