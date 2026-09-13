import { ORDER_STATUS } from "@spicycorner/shared";

export type SortDir = "asc" | "desc";

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens browser print dialog for a simple HTML report (Save as PDF). */
export function downloadPdfReport(title: string, htmlBody: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;margin:24px;color:#0f172a} table{width:100%;border-collapse:collapse;margin:12px 0}
    th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;font-size:12px} th{background:#f8fafc}</style></head><body>${htmlBody}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: items.length,
  };
}

export function sortItems<T>(
  items: T[],
  key: keyof T | ((item: T) => string | number),
  dir: SortDir
): T[] {
  const get = typeof key === "function" ? key : (item: T) => item[key] as string | number;
  return [...items].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export type PaymentFilterCategory = "pending" | "paid" | "failed" | "refunded";

/** Maps order status to the payment filter dropdown category. */
export function paymentFilterCategory(status: string): PaymentFilterCategory {
  if (status === ORDER_STATUS.PENDING_PAYMENT) return "pending";
  if (status === ORDER_STATUS.REFUNDED) return "refunded";
  if (status === ORDER_STATUS.CANCELLED) return "failed";
  return "paid";
}

export function matchesPaymentFilter(status: string, filter: string): boolean {
  if (filter === "all") return true;
  return paymentFilterCategory(status) === filter;
}

/** Status tab filter — "Paid" means payment received (any post-payment status). */
export function matchesOrderStatusTab(status: string, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === ORDER_STATUS.PAID) return matchesPaymentFilter(status, "paid");
  // Processing tab = orders awaiting payment / still being processed for payment
  if (tab === ORDER_STATUS.PROCESSING) {
    return status === ORDER_STATUS.PENDING_PAYMENT;
  }
  if (tab === ORDER_STATUS.DELIVERED) {
    return status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETE;
  }
  return status === tab;
}

export function paymentStatusLabel(status: string): string {
  if (status === ORDER_STATUS.PENDING_PAYMENT) return "Pending";
  if (status === ORDER_STATUS.REFUNDED) return "Refunded";
  if (status === ORDER_STATUS.CANCELLED) return "Failed";
  return "Paid";
}

export function paymentStatusClass(status: string): string {
  if (status === ORDER_STATUS.PENDING_PAYMENT) return "bg-amber-100 text-amber-800";
  if (status === ORDER_STATUS.REFUNDED) return "bg-purple-100 text-purple-800";
  if (status === ORDER_STATUS.CANCELLED) return "bg-red-100 text-red-800";
  return "bg-green-100 text-green-800";
}

export function shippingStatusLabel(status: string): string {
  if (status === ORDER_STATUS.SHIPPED) return "Shipped";
  if (status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETE) return "Delivered";
  if (status === ORDER_STATUS.ON_HOLD) return "On hold";
  if (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED) return "—";
  if (status === ORDER_STATUS.PENDING_PAYMENT) return "—";
  return "Pending";
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "<1s";
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

/** Prefer measured active time (page pings) over first/last event gap. */
export function sessionDurationMs(session: {
  firstSeen: string;
  lastSeen: string;
  activeDurationMs?: number;
}): number {
  if (session.activeDurationMs && session.activeDurationMs > 0) {
    return session.activeDurationMs;
  }
  return new Date(session.lastSeen).getTime() - new Date(session.firstSeen).getTime();
}

export function referrerLabel(referrer?: string): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("google")) return "Google";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    return host;
  } catch {
    return referrer.slice(0, 40);
  }
}
