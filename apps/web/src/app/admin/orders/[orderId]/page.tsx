"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import type { Order, RateQuote } from "@spicycorner/shared";
import {
  ORDER_STATUS,
  VENDOR_ORANGE_COUNTY,
  VENDOR_SPICYCORNER,
  VENDOR_CJ_DROPSHIPPING,
  ensureVendorFulfillments,
  isMultiVendorOrder,
  isCjDropshippingProduct,
  getspiceHamperDef,
  lineVendorKey,
  orderHasOrangeCounty,
  orderHasUsarakhi,
  vendorDisplayLabel,
  isManualWhatsAppStatus,
  orderStatusWhatsAppDeepLink,
} from "@spicycorner/shared";
import {
  statusLabel,
  badgeClass,
  nextStatuses,
  FULFILLMENT_STEPS,
} from "@/lib/order-status";
import {
  formatMoney,
  paymentStatusClass,
  paymentStatusLabel,
  shippingStatusLabel,
} from "@/lib/admin-utils";
import { canDownloadShippingLabel, printShippingLabel } from "@/lib/shipping-label";

type AdminOrder = Order & {
  adminNotes?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
};

export default function AdminOrderDetailPage() {
  const apiClient = useApiClient();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [vendorTracking, setVendorTracking] = useState<
    Record<string, { trackingNumber: string; carrier: string }>
  >({});
  const [note, setNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [buyingLabel, setBuyingLabel] = useState(false);
  const [pushingCj, setPushingCj] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(false);
  const [ratesWarning, setRatesWarning] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [rateOptions, setRateOptions] = useState<RateQuote[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");

  const syncVendorTrackingState = (o: AdminOrder) => {
    const rows = ensureVendorFulfillments(o);
    const map: Record<string, { trackingNumber: string; carrier: string }> = {};
    for (const f of rows) {
      map[f.vendorSlug] = {
        trackingNumber: f.trackingNumber ?? "",
        carrier: f.carrier ?? "",
      };
    }
    setVendorTracking(map);
    // Keep legacy single fields in sync with SpicyCorner lane (or sole vendor).
    const us = rows.find((r) => r.vendorSlug === VENDOR_SPICYCORNER) ?? rows[0];
    setTrackingNumber(us?.trackingNumber ?? o.trackingNumber ?? "");
    setCarrier(us?.carrier ?? o.carrier ?? "");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`);
      setOrder(data.order);
      syncVendorTrackingState(data.order);
      setAdminNotes(data.order.adminNotes ?? "");
      setEstimatedDeliveryAt(data.order.estimatedDeliveryAt?.slice(0, 10) ?? "");
      setSelectedRateId(data.order.shippingRateId ?? "");
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch {
      setError("Could not load order.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const shippingFieldsRelevant =
        newStatus === ORDER_STATUS.PROCESSING ||
        newStatus === ORDER_STATUS.SHIPPED ||
        order?.status === ORDER_STATUS.PROCESSING ||
        order?.status === ORDER_STATUS.SHIPPED;

      const multi = order ? isMultiVendorOrder(order) : false;
      const payload: Record<string, unknown> = {
        note: note || undefined,
        adminNotes,
      };

      if (shippingFieldsRelevant) {
        payload.estimatedDeliveryAt = estimatedDeliveryAt
          ? new Date(estimatedDeliveryAt).toISOString()
          : undefined;
        if (multi) {
          const lanes = ensureVendorFulfillments(order!);
          payload.vendorFulfillments = lanes.map((f) => ({
            vendorSlug: f.vendorSlug,
            trackingNumber: vendorTracking[f.vendorSlug]?.trackingNumber?.trim() || undefined,
            carrier: vendorTracking[f.vendorSlug]?.carrier?.trim() || undefined,
          }));
        } else {
          payload.trackingNumber = trackingNumber || undefined;
          payload.carrier = carrier || undefined;
        }
      }

      const allowed = order ? nextStatuses(order.status) : [];
      if (allowed.length > 0 && newStatus) {
        payload.status = newStatus;
      }
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setOrder(data.order);
      syncVendorTrackingState(data.order);
      setNote("");
      setMessage("Order updated.");
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (status: string) => {
    setSaving(true);
    setError("");
    try {
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({ status, note: `Status changed to ${statusLabel(status)}` }),
      });
      setOrder(data.order);
      setMessage(`Order marked as ${statusLabel(status)}.`);
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = () => window.print();

  const loadRates = async () => {
    setLoadingRates(true);
    setError("");
    setRatesWarning("");
    setMessage("");
    try {
      const data = await apiClient<{ rates: RateQuote[]; warning?: string }>(
        `/admin/orders/${orderId}/rates`,
        { method: "POST" }
      );
      setRateOptions(data.rates ?? []);
      if (data.warning) {
        setRatesWarning(data.warning);
        setError(data.warning);
      }
      if (data.rates?.length) {
        const current = order?.shippingRateId;
        const match = current ? data.rates.find((r) => r.rateId === current) : undefined;
        setSelectedRateId(match?.rateId ?? data.rates[0].rateId);
        setMessage(`Loaded ${data.rates.length} USPS rate${data.rates.length === 1 ? "" : "s"}.`);
      } else if (!data.warning) {
        const msg =
          "No USPS rates returned. Set Admin → Shipping origin address, then try Load rates again.";
        setRatesWarning(msg);
        setError(msg);
      }
    } catch (err) {
      setRateOptions([]);
      const msg = err instanceof Error ? err.message : "Could not load rates.";
      setRatesWarning(msg);
      setError(msg);
    } finally {
      setLoadingRates(false);
    }
  };

  const saveShippingService = async () => {
    const rate = rateOptions.find((r) => r.rateId === selectedRateId);
    if (!rate) {
      setError("Select a shipping service.");
      return;
    }
    setSavingService(true);
    setError("");
    try {
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          shippingServiceCode: rate.mailClass,
          shippingServiceName: rate.serviceName,
          shippingRateId: rate.rateId,
          estimatedLabelCost: rate.price,
        }),
      });
      setOrder(data.order);
      setMessage("Shipping service updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save shipping service.");
    } finally {
      setSavingService(false);
    }
  };

  const buyUspsLabel = async () => {
    setBuyingLabel(true);
    setError("");
    setMessage("");
    try {
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}/buy-label`, {
        method: "POST",
      });
      setOrder(data.order);
      syncVendorTrackingState(data.order);
      setMessage("USPS label purchased.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Label purchase failed.");
      await load();
    } finally {
      setBuyingLabel(false);
    }
  };

  const pushToCj = async () => {
    setPushingCj(true);
    setError("");
    setMessage("");
    try {
      const data = await apiClient<{ ok: boolean; message: string; cjOrderId?: string; cjPayUrl?: string }>(
        `/admin/cj/orders/${encodeURIComponent(orderId)}/fulfill`,
        { method: "POST", body: JSON.stringify({}) }
      );
      await load();
      setMessage(
        data.message +
          (data.cjOrderId ? ` CJ order ${data.cjOrderId}.` : "") +
          (data.cjPayUrl ? " Pay the CJ invoice in the CJ portal if the wallet is empty." : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not push this order to CJ Dropshipping.");
    } finally {
      setPushingCj(false);
    }
  };

  /** Pull capture status from Razorpay when browser verify/webhook was missed. */
  const syncRazorpayPayment = async () => {
    setSyncingPayment(true);
    setError("");
    setMessage("");
    try {
      const data = await apiClient<{ order: AdminOrder; synced?: boolean; alreadyPaid?: boolean }>(
        `/admin/orders/${orderId}/sync-payment`,
        { method: "POST" }
      );
      setOrder(data.order);
      setMessage(
        data.alreadyPaid
          ? "Order was already paid."
          : data.synced
            ? "Payment synced from Razorpay — order marked paid."
            : "Sync completed."
      );
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync payment from Razorpay.");
    } finally {
      setSyncingPayment(false);
    }
  };

  const labelStatusLabel = (status?: string) => {
    switch (status) {
      case "purchased":
        return "Purchased";
      case "failed":
        return "Failed";
      case "queued":
        return "Queued";
      default:
        return "None";
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-500">Loading…</div>;
  if (!order) return <div className="max-w-4xl mx-auto px-4 py-10 text-red-600">{error || "Order not found."}</div>;

  const currentStepIndex = FULFILLMENT_STEPS.indexOf(order.status as (typeof FULFILLMENT_STEPS)[number]);
  const transitions = nextStatuses(order.status);
  const addr = order.shippingAddress;
  const showShippingFields =
    newStatus === ORDER_STATUS.PROCESSING ||
    newStatus === ORDER_STATUS.SHIPPED ||
    (transitions.length === 0 &&
      (order.status === ORDER_STATUS.PROCESSING || order.status === ORDER_STATUS.SHIPPED));
  const isAcceptOnly = newStatus === ORDER_STATUS.ACCEPTED;
  const isOnHoldOnly = newStatus === ORDER_STATUS.ON_HOLD;
  const isReviveFromCancelled = order.status === ORDER_STATUS.CANCELLED;
  const canBuyLabel =
    (order.status === ORDER_STATUS.PAID ||
      order.status === ORDER_STATUS.ACCEPTED ||
      order.status === ORDER_STATUS.PROCESSING) &&
    order.labelStatus !== "purchased";
  const labelMargin =
    order.labelCost != null ? order.shipping - order.labelCost : null;
  const hasOc = orderHasOrangeCounty(order);
  const hasUs = orderHasUsarakhi(order);
  const multiVendor = isMultiVendorOrder(order);
  const fulfillments = ensureVendorFulfillments(order);
  const hasCjItems = (order.items ?? []).some(
    (item) =>
      isCjDropshippingProduct({ vendorSlug: item.vendorSlug, cjPid: item.cjPid }) ||
      Boolean(item.cjVid) ||
      Boolean(getspiceHamperDef(item.productSlug))
  );
  const cjLane = fulfillments.find((f) => f.vendorSlug === VENDOR_CJ_DROPSHIPPING);
  const canPushCj =
    hasCjItems &&
    !cjLane?.cjOrderId &&
    order.status !== ORDER_STATUS.PENDING_PAYMENT &&
    order.status !== ORDER_STATUS.CANCELLED;
  const whatsappHref = orderStatusWhatsAppDeepLink(order);
  const showWhatsApp = isManualWhatsAppStatus(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/admin/orders" className="text-sm text-nav hover:underline">
        ← Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Order {order.orderNumber ?? order.orderId}
          </h1>
          {order.orderNumber ? (
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID {order.orderId}</p>
          ) : null}
          <p className="text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString()} · Updated{" "}
            {new Date(order.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasOc && (
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
              Orange County
            </span>
          )}
          {hasUs && (
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">
              SpicyCorner
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass(order.status)}`}>
            {statusLabel(order.status)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${paymentStatusClass(order.status)}`}
          >
            {paymentStatusLabel(order.status)}
          </span>
          <button
            type="button"
            onClick={printInvoice}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 print:hidden"
          >
            Download invoice
          </button>
          {canDownloadShippingLabel(order.status) && (
            <button
              type="button"
              onClick={() => printShippingLabel(order)}
              className="text-sm border border-nav text-nav rounded-lg px-3 py-1.5 hover:bg-blue-50 print:hidden font-medium"
            >
              Download shipping label
            </button>
          )}
          {showWhatsApp && whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-[#25D366] text-white rounded-lg px-3 py-1.5 hover:bg-[#1ebe5d] print:hidden font-medium"
            >
              Send WhatsApp
            </a>
          )}
          {order.status === ORDER_STATUS.PENDING_PAYMENT && (
            <Link
              href={`/checkout?orderId=${order.orderId}`}
              className="text-sm bg-amber-600 text-white rounded-lg px-3 py-1.5 print:hidden"
            >
              Retry payment
            </Link>
          )}
        </div>
      </div>

      <div id="invoice-print" className="hidden print:block mb-8">
        <h2 className="text-xl font-bold">Invoice — {order.orderNumber ?? order.orderId}</h2>
        <p className="text-sm">{addr.name} · {addr.email}</p>
        <p className="text-sm mt-4 font-bold">Total: {formatMoney(order.total, order.currency)}</p>
      </div>

      {/* Fulfillment stepper */}
      {order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.REFUNDED && (
        <div className="flex items-center mb-8">
          {FULFILLMENT_STEPS.map((step, i) => {
            const done = i <= currentStepIndex && currentStepIndex >= 0;
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? "bg-nav text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[11px] mt-1 text-slate-500 text-center w-20">
                    {statusLabel(step)}
                  </span>
                </div>
                {i < FULFILLMENT_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < currentStepIndex ? "bg-nav" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items + totals */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Items</h2>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productSlug} className="flex items-center gap-3 py-3">
                  {item.image ? (
                    <Link
                      href={`/products/${item.productSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-0 hover:z-30 shrink-0 group"
                      title={`View ${item.name} on storefront`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded object-cover border border-slate-200 bg-slate-50 transition-transform duration-200 ease-out group-hover:scale-[3.2] group-hover:shadow-xl group-hover:border-nav origin-left"
                      />
                    </Link>
                  ) : (
                    <Link
                      href={`/products/${item.productSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded border border-dashed border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center text-[10px] text-slate-400"
                      title={`View ${item.name} on storefront`}
                    >
                      View
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/products/${item.productSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-nav hover:underline"
                      >
                        {item.name}
                      </Link>
                      {lineVendorKey(item) === VENDOR_ORANGE_COUNTY ? (
                        <span className="rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-[10px] font-semibold">
                          Orange County
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold">
                          SpicyCorner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Qty {item.quantity}
                      {item.sku ? ` · SKU ${item.sku}` : ""}
                    </p>
                    {item.addons?.length ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {item.addons.map((a) => (
                          <li key={a.id}>
                            + {a.quantity > 1 ? `${a.quantity}× ` : ""}
                            {a.name} ({formatMoney(a.price * a.quantity * item.quantity, order.currency)})
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className="text-sm shrink-0">
                    {formatMoney(
                      (item.price + (item.addons?.reduce((s, a) => s + a.price * a.quantity, 0) ?? 0)) *
                        item.quantity,
                      order.currency
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping</span>
                <span>{formatMoney(order.shipping, order.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total ({order.currency})</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </section>

          {/* Status history */}
          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Status history</h2>
            {order.statusHistory?.length ? (
              <ol className="relative border-l border-slate-200 ml-2">
                {[...order.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="ml-4 pb-4 last:pb-0">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-nav" />
                    <p className="text-sm font-medium">{statusLabel(h.status)}</p>
                    <p className="text-xs text-slate-400">{new Date(h.at).toLocaleString()}</p>
                    {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No history yet.</p>
            )}
          </section>
        </div>

        {/* Sidebar: customer + update */}
        <div className="space-y-6">
          <section className="bg-white border rounded-xl p-5 text-sm">
            <h2 className="font-semibold mb-3">Customer</h2>
            {addr.senderName && (
              <p className="text-xs text-slate-500 mb-1">
                Gift from: <span className="font-semibold text-slate-800">{addr.senderName}</span>
              </p>
            )}
            {addr.senderMessage && (
              <p className="text-xs text-slate-600 italic mb-2 border-l-2 border-amber-300 pl-2 leading-relaxed">
                “{addr.senderMessage}”
              </p>
            )}
            {order.shipments && order.shipments.length > 1 ? (
              <div className="space-y-4">
                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  Multi-address order · {order.shipments.length} deliveries · shipping{" "}
                  {formatMoney(order.shipping, order.currency)} total
                </p>
                {order.shipments.map((shipment, idx) => (
                  <div
                    key={shipment.shipmentId}
                    className="border-t border-slate-100 pt-3 first:border-0 first:pt-0"
                  >
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      Delivery {idx + 1} ·{" "}
                      {shipment.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </p>
                    <p className="text-xs text-slate-500 mb-1">
                      Subtotal {formatMoney(shipment.subtotal, order.currency)}
                      {" · "}
                      Shipping{" "}
                      {shipment.shipping > 0
                        ? formatMoney(shipment.shipping, order.currency)
                        : "FREE"}
                    </p>
                    <p className="font-medium">{shipment.shippingAddress.name}</p>
                    <p className="text-slate-500">{shipment.shippingAddress.email}</p>
                    {shipment.shippingAddress.phone && (
                      <p className="text-slate-500">{shipment.shippingAddress.phone}</p>
                    )}
                    <div className="mt-2 text-slate-600">
                      <p>{shipment.shippingAddress.line1}</p>
                      {shipment.shippingAddress.line2 && <p>{shipment.shippingAddress.line2}</p>}
                      <p>
                        {shipment.shippingAddress.city}, {shipment.shippingAddress.state}{" "}
                        {shipment.shippingAddress.postalCode}
                      </p>
                      <p>{shipment.shippingAddress.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="font-medium">{addr.name}</p>
                <p className="text-slate-500">{addr.email}</p>
                {addr.phone && <p className="text-slate-500">{addr.phone}</p>}
                <div className="mt-3 text-slate-600">
                  <p>{addr.line1}</p>
                  {addr.line2 && <p>{addr.line2}</p>}
                  <p>
                    {addr.city}, {addr.state} {addr.postalCode}
                  </p>
                  <p>{addr.country}</p>
                </div>
              </>
            )}
          </section>

          <section className="bg-white border rounded-xl p-5 text-sm">
            <h2 className="font-semibold mb-3">Payment & shipping</h2>
            <p className="text-slate-600 capitalize">Method: {order.paymentProvider ?? "—"}</p>
            {order.status === ORDER_STATUS.PENDING_PAYMENT &&
              (order.paymentProvider === "razorpay" || order.razorpayOrderId) && (
                <button
                  type="button"
                  disabled={syncingPayment}
                  onClick={() => void syncRazorpayPayment()}
                  className="mt-2 text-sm rounded-lg border border-nav text-nav px-3 py-1.5 hover:bg-blue-50 disabled:opacity-50"
                >
                  {syncingPayment ? "Checking Razorpay…" : "Sync payment from Razorpay"}
                </button>
              )}
            <p className="text-slate-600 mt-1">Shipping: {shippingStatusLabel(order.status)}</p>
            {(order.shippingServiceName || order.shippingServiceCode) && (
              <p className="text-slate-600 mt-1">
                USPS service: {order.shippingServiceName ?? order.shippingServiceCode}
                {order.shippingServiceCode && order.shippingServiceName ? (
                  <span className="text-slate-400"> ({order.shippingServiceCode})</span>
                ) : null}
              </p>
            )}
            {order.estimatedLabelCost != null && (
              <p className="text-slate-600 mt-1">
                Est. label cost: {formatMoney(order.estimatedLabelCost, order.currency)}
              </p>
            )}
            {order.labelCost != null && (
              <p className="text-slate-600 mt-1">
                Label cost: {formatMoney(order.labelCost, order.currency)}
              </p>
            )}
            {order.labelStatus && (
              <p className="text-slate-600 mt-1">
                Label status:{" "}
                <span
                  className={
                    order.labelStatus === "failed"
                      ? "text-red-700 font-medium"
                      : order.labelStatus === "purchased"
                        ? "text-green-700 font-medium"
                        : ""
                  }
                >
                  {labelStatusLabel(order.labelStatus)}
                </span>
              </p>
            )}
            {order.labelError && (
              <p className="text-red-600 text-xs mt-1">Label error: {order.labelError}</p>
            )}
            {error && !ratesWarning && (
              <p className="text-red-600 text-xs mt-1 whitespace-pre-wrap">{error}</p>
            )}
            {message && (
              <p className="text-green-600 text-xs mt-1">{message}</p>
            )}
            {labelMargin != null && (
              <p className="text-xs text-slate-500 mt-2 border-t pt-2">
                Customer shipping charged {formatMoney(order.shipping, order.currency)} vs label{" "}
                {formatMoney(order.labelCost!, order.currency)}
                {labelMargin >= 0 ? (
                  <span className="text-green-700"> · margin {formatMoney(labelMargin, order.currency)}</span>
                ) : (
                  <span className="text-red-700">
                    {" "}
                    · loss {formatMoney(Math.abs(labelMargin), order.currency)}
                  </span>
                )}
              </p>
            )}
            {order.labelPdfUrl && (
              <a
                href={order.labelPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-nav hover:underline text-sm font-medium"
              >
                View USPS label PDF
              </a>
            )}
            {canBuyLabel && (
              <button
                type="button"
                disabled={buyingLabel}
                onClick={() => void buyUspsLabel()}
                className="mt-3 w-full bg-nav text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {buyingLabel ? "Purchasing label…" : "Buy USPS label"}
              </button>
            )}
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Vendor shipping
              </p>
              {fulfillments.map((f) => (
                <div key={f.vendorSlug} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700">
                    {vendorDisplayLabel(f.vendorSlug)}
                    {f.status ? (
                      <span className="ml-2 font-normal text-slate-500 capitalize">
                        · {f.status}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-slate-600 mt-0.5 text-sm">
                    {f.trackingNumber
                      ? `${f.trackingNumber}${f.carrier ? ` (${f.carrier})` : ""}`
                      : "No tracking yet"}
                  </p>
                  {f.cjOrderId ? (
                    <p className="text-[11px] text-slate-500 mt-1 break-all">
                      CJ order {f.cjOrderId}
                      {f.cjOrderNumber ? ` · ${f.cjOrderNumber}` : ""}
                    </p>
                  ) : null}
                  {f.cjPayUrl ? (
                    <a
                      href={f.cjPayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-nav hover:underline mt-1 inline-block"
                    >
                      Pay this CJ order
                    </a>
                  ) : null}
                </div>
              ))}
              {canPushCj && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
                  <p className="text-xs text-amber-900">
                    This order has CJ Dropshipping products but is not in the CJ portal yet.
                    {order.cjFulfillError ? ` Last error: ${order.cjFulfillError}` : ""}
                  </p>
                  <button
                    type="button"
                    disabled={pushingCj}
                    onClick={() => void pushToCj()}
                    className="w-full bg-nav text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {pushingCj ? "Pushing to CJ…" : "Push to CJ Dropshipping"}
                  </button>
                </div>
              )}
              {multiVendor && (
                <p className="text-[11px] text-slate-500">
                  Mixed cart: Orange County and SpicyCorner each get their own AWB. Order becomes Shipped
                  when both are filled.
                </p>
              )}
            </div>
            {order.estimatedDeliveryAt && (
              <p className="text-slate-600 mt-1">
                Est. delivery: {new Date(order.estimatedDeliveryAt).toLocaleDateString()}
              </p>
            )}
            {order.deliveredAt && (
              <p className="text-slate-600 mt-1">
                Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Invoice: {order.status === ORDER_STATUS.PENDING_PAYMENT ? "Pending payment" : "Generated"}
            </p>
            {order.razorpayPaymentId && (
              <p className="text-xs text-slate-400 break-all mt-1">RZP: {order.razorpayPaymentId}</p>
            )}
            {order.paymentIntentId && (
              <p className="text-xs text-slate-400 break-all mt-1">PI: {order.paymentIntentId}</p>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">USPS service override</p>
              <p className="text-[11px] text-slate-400 mb-2">
                If Buy USPS label fails, load rates here, pick a service, save, then buy again.
                Origin address must be set under{" "}
                <Link href="/admin/shipping" className="text-nav underline">
                  Admin → Shipping
                </Link>
                .
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  disabled={loadingRates}
                  onClick={() => void loadRates()}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loadingRates ? "Loading rates…" : "Load rates"}
                </button>
              </div>
              {ratesWarning && (
                <p className="text-red-600 text-xs mb-2 whitespace-pre-wrap">{ratesWarning}</p>
              )}
              {rateOptions.length > 0 && (
                <>
                  <select
                    value={selectedRateId}
                    onChange={(e) => setSelectedRateId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm mb-2"
                  >
                    {rateOptions.map((r) => (
                      <option key={r.rateId} value={r.rateId}>
                        {r.serviceName} — {formatMoney(r.price, order.currency)}
                        {r.estimatedDeliveryDate
                          ? ` · by ${new Date(r.estimatedDeliveryDate).toLocaleDateString()}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={savingService || !selectedRateId}
                    onClick={() => void saveShippingService()}
                    className="w-full border border-nav text-nav py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-50"
                  >
                    {savingService ? "Saving…" : "Save shipping service"}
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Admin notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
              placeholder="Internal remarks (not visible to customer)"
            />
          </section>

          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Update order</h2>
            {(transitions.includes(ORDER_STATUS.CANCELLED) ||
              transitions.includes(ORDER_STATUS.REFUNDED)) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {transitions.includes(ORDER_STATUS.CANCELLED) && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => quickStatus(ORDER_STATUS.CANCELLED)}
                    className="text-xs border border-red-200 text-red-700 px-2 py-1 rounded"
                  >
                    Cancel order
                  </button>
                )}
                {transitions.includes(ORDER_STATUS.REFUNDED) && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => quickStatus(ORDER_STATUS.REFUNDED)}
                    className="text-xs border border-purple-200 text-purple-700 px-2 py-1 rounded"
                  >
                    Mark refunded
                  </button>
                )}
              </div>
            )}
            {transitions.length === 0 ? (
              <p className="text-sm text-slate-500">
                This order is in a final state.
                {showShippingFields
                  ? " You can still update tracking and notes."
                  : " You can still update notes."}
              </p>
            ) : null}
            <form onSubmit={handleUpdate} className="space-y-3">
              {transitions.length > 0 && (
                <label className="block text-xs font-medium text-slate-500">
                  New status
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  >
                    {transitions.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {isReviveFromCancelled && transitions.length > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  This order was cancelled. Moving it to On hold, Order Confirmed, or Processing revives it for
                  fulfillment.
                </p>
              )}

              {isAcceptOnly && !isReviveFromCancelled && (
                <p className="text-xs text-slate-500">
                  Confirming the order emails the customer automatically. Use Send WhatsApp to open a pre-filled
                  message you can review and send. Add tracking when you move it to Processing or Shipped.
                </p>
              )}
              {order.status === ORDER_STATUS.ACCEPTED && (
                <p className="text-xs text-slate-500">
                  The Order Confirmed email was sent when this status was set. Use Send WhatsApp to open a
                  pre-filled message with the same order details.
                </p>
              )}
              {(order.status === ORDER_STATUS.DELIVERED || order.status === ORDER_STATUS.COMPLETE) && (
                <p className="text-xs text-slate-500">
                  The delivered/completed email was sent when this status was set. Use Send WhatsApp to open a
                  pre-filled message with order details and the review link.
                </p>
              )}
              {showWhatsApp && !whatsappHref && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  No customer phone on this order, so WhatsApp cannot be opened.
                </p>
              )}
              {showWhatsApp && whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full bg-[#25D366] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#1ebe5d]"
                >
                  Send WhatsApp
                </a>
              )}

              {showShippingFields && (
                <>
                  <label className="block text-xs font-medium text-slate-500">
                    Expected delivery date
                    <input
                      type="date"
                      value={estimatedDeliveryAt}
                      onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                    />
                  </label>

                  {multiVendor ? (
                    <div className="space-y-3">
                      {fulfillments.map((f) => (
                        <div
                          key={f.vendorSlug}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                        >
                          <p className="text-xs font-semibold text-slate-700">
                            {vendorDisplayLabel(f.vendorSlug)} tracking
                          </p>
                          <label className="block text-xs font-medium text-slate-500">
                            Tracking number
                            <input
                              value={vendorTracking[f.vendorSlug]?.trackingNumber ?? ""}
                              onChange={(e) =>
                                setVendorTracking((prev) => ({
                                  ...prev,
                                  [f.vendorSlug]: {
                                    trackingNumber: e.target.value,
                                    carrier: prev[f.vendorSlug]?.carrier ?? "",
                                  },
                                }))
                              }
                              className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                              placeholder={
                                f.vendorSlug === VENDOR_ORANGE_COUNTY
                                  ? "OC / vendor AWB"
                                  : "e.g. USPS / FedEx"
                              }
                            />
                          </label>
                          <label className="block text-xs font-medium text-slate-500">
                            Carrier
                            <input
                              value={vendorTracking[f.vendorSlug]?.carrier ?? ""}
                              onChange={(e) =>
                                setVendorTracking((prev) => ({
                                  ...prev,
                                  [f.vendorSlug]: {
                                    trackingNumber: prev[f.vendorSlug]?.trackingNumber ?? "",
                                    carrier: e.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                              placeholder="e.g. FedEx, DHL, USPS"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-slate-500">
                        Tracking number
                        <input
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                          placeholder="e.g. 1Z999…"
                        />
                      </label>

                      <label className="block text-xs font-medium text-slate-500">
                        Carrier
                        <input
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                          placeholder="e.g. FedEx, DHL"
                        />
                      </label>
                    </>
                  )}
                </>
              )}

              <label className="block text-xs font-medium text-slate-500">
                Status note (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-nav text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : isReviveFromCancelled
                    ? isOnHoldOnly
                      ? "Revive → on hold"
                      : isAcceptOnly
                        ? "Revive → order confirmed"
                        : "Revive order"
                    : isAcceptOnly
                      ? "Confirm order"
                      : isOnHoldOnly
                        ? "Put on hold"
                        : "Save update"}
              </button>
            </form>
            {message && <p className="text-green-600 text-xs mt-2">{message}</p>}
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
