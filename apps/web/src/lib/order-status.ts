import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from "@spicycorner/shared";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.PENDING_PAYMENT]: "Pending payment",
  [ORDER_STATUS.PAID]: "Paid",
  [ORDER_STATUS.ACCEPTED]: "Order Confirmed",
  [ORDER_STATUS.ON_HOLD]: "On hold",
  [ORDER_STATUS.PROCESSING]: "Processing",
  [ORDER_STATUS.SHIPPED]: "Shipped",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.COMPLETE]: "Complete",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
  [ORDER_STATUS.REFUNDED]: "Refunded",
};

export const ORDER_STATUS_BADGE: Record<string, string> = {
  [ORDER_STATUS.PENDING_PAYMENT]: "bg-amber-100 text-amber-800",
  [ORDER_STATUS.PAID]: "bg-blue-100 text-blue-800",
  [ORDER_STATUS.ACCEPTED]: "bg-cyan-100 text-cyan-800",
  [ORDER_STATUS.ON_HOLD]: "bg-orange-100 text-orange-900",
  [ORDER_STATUS.PROCESSING]: "bg-indigo-100 text-indigo-800",
  [ORDER_STATUS.SHIPPED]: "bg-purple-100 text-purple-800",
  [ORDER_STATUS.DELIVERED]: "bg-green-100 text-green-800",
  [ORDER_STATUS.COMPLETE]: "bg-emerald-100 text-emerald-900",
  [ORDER_STATUS.CANCELLED]: "bg-slate-200 text-slate-700",
  [ORDER_STATUS.REFUNDED]: "bg-red-100 text-red-800",
};

/** Main fulfillment progression shown as a stepper. */
export const FULFILLMENT_STEPS = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETE,
] as const;

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function badgeClass(status: string): string {
  return ORDER_STATUS_BADGE[status] ?? "bg-slate-100 text-slate-700";
}

export function nextStatuses(current: string): string[] {
  return ORDER_STATUS_TRANSITIONS[current] ?? [];
}
