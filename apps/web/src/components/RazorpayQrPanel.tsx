"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Order } from "@spicycorner/shared";
import { ORDER_STATUS } from "@spicycorner/shared";

type Props = {
  qrImageUrl: string;
  amountLabel: string;
  orderId: string;
  sessionId: string;
  token?: string | null;
  onPaid: (order: Order) => void;
  onOpenCheckout: () => void;
  openingCheckout: boolean;
};

/** Poll order status while customer pays via UPI QR (webhook/reconcile marks paid). */
export function RazorpayQrPanel({
  qrImageUrl,
  amountLabel,
  orderId,
  sessionId,
  token,
  onPaid,
  onOpenCheckout,
  openingCheckout,
}: Props) {
  const [waiting, setWaiting] = useState(true);
  const paidRef = useRef(false);

  useEffect(() => {
    paidRef.current = false;
    setWaiting(true);
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 90; // ~3 minutes at 2s

    const tick = async () => {
      if (cancelled || paidRef.current) return;
      attempts += 1;
      try {
        const res = await api<{ order: Order }>(`/orders/${orderId}`, {
          sessionId,
          token: token ?? undefined,
        });
        if (
          res.order.status === ORDER_STATUS.PAID ||
          res.order.status === ORDER_STATUS.PROCESSING ||
          res.order.status === ORDER_STATUS.ACCEPTED
        ) {
          paidRef.current = true;
          setWaiting(false);
          onPaid(res.order);
          return;
        }
      } catch {
        /* keep polling */
      }
      if (attempts >= maxAttempts) {
        setWaiting(false);
        return;
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, sessionId, token, onPaid]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Scan to pay with UPI</p>
        <p className="text-xs text-slate-500 mt-1">
          Open any UPI app (GPay, PhonePe, Paytm) and scan this QR code to pay {amountLabel}.
        </p>
      </div>
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrImageUrl}
          alt="UPI payment QR code"
          className="h-52 w-52 rounded-lg border border-slate-200 bg-white object-contain"
        />
      </div>
      <p className="text-xs text-center text-slate-500">
        {waiting
          ? "Waiting for payment confirmation… keep this page open after you pay."
          : "Still waiting? Use card/netbanking below, or refresh this page in a minute."}
      </p>
      <button
        type="button"
        onClick={onOpenCheckout}
        disabled={openingCheckout}
        className="w-full rounded-md border-2 border-nav text-nav font-semibold text-sm py-2.5 hover:bg-blue-50 disabled:opacity-50 transition"
      >
        {openingCheckout ? "Opening…" : "Pay with card / netbanking instead"}
      </button>
    </div>
  );
}
