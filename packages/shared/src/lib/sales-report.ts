import { ORDER_STATUS } from "../constants";
import type { Order } from "../schemas/order";

/** Order statuses that count as received payment (excludes pending, cancelled, refunded). */
export const REVENUE_ORDER_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.ON_HOLD,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETE,
] as const;

export type RevenueOrderStatus = (typeof REVENUE_ORDER_STATUSES)[number];

export function isRevenueOrder(status: string): boolean {
  return (REVENUE_ORDER_STATUSES as readonly string[]).includes(status);
}

/** When payment was received — paid status history entry or createdAt fallback. */
export function getOrderPaidAt(order: Pick<Order, "status" | "createdAt" | "statusHistory">): string | null {
  if (!isRevenueOrder(order.status)) return null;
  const paidEntry = order.statusHistory?.find((h) => h.status === ORDER_STATUS.PAID);
  return paidEntry?.at ?? order.createdAt;
}

export type SalesPeriod = "day" | "week" | "month";

export type SalesOrderRow = {
  orderId: string;
  paidAt: string;
  customerName: string;
  email: string;
  total: number;
  currency: "USD" | "INR";
  status: string;
  paymentProvider?: string;
  itemCount: number;
};

export type SalesBucket = {
  label: string;
  date: string;
  orderCount: number;
  revenueUSD: number;
  revenueINR: number;
};

export type SalesPeriodReport = {
  period: SalesPeriod;
  label: string;
  from: string;
  to: string;
  orderCount: number;
  revenueUSD: number;
  revenueINR: number;
  excluded: {
    refunded: number;
    cancelled: number;
    pendingPayment: number;
  };
  breakdown: SalesBucket[];
  orders: SalesOrderRow[];
};

export type SalesReportResponse = {
  generatedAt: string;
  day: SalesPeriodReport;
  week: SalesPeriodReport;
  month: SalesPeriodReport;
};

export function periodRange(period: SalesPeriod, now = new Date()): { from: Date; to: Date; label: string } {
  const to = new Date(now);
  const from = new Date(now);

  if (period === "day") {
    from.setUTCHours(0, 0, 0, 0);
    return { from, to, label: "Today" };
  }
  if (period === "week") {
    from.setUTCDate(from.getUTCDate() - 6);
    from.setUTCHours(0, 0, 0, 0);
    return { from, to, label: "Last 7 days" };
  }
  from.setUTCDate(from.getUTCDate() - 29);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to, label: "Last 30 days" };
}

export function addToRevenue(totals: { USD: number; INR: number }, currency: "USD" | "INR", amount: number) {
  totals[currency] += amount;
}
