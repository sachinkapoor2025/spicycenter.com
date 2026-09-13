import { ORDER_STATUS } from "../constants";
import type { Order } from "../schemas/order";

/** Days after delivery before asking for a review. */
export const REVIEW_EMAIL_DELAY_DAYS = 1;

export const REVIEW_EMAIL_DELAY_MS = REVIEW_EMAIL_DELAY_DAYS * 24 * 60 * 60 * 1000;

export function isDeliveredStatus(status: string): boolean {
  return status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETE;
}

export function reviewEmailDueAtFrom(deliveredAtIso: string): string {
  return new Date(new Date(deliveredAtIso).getTime() + REVIEW_EMAIL_DELAY_MS).toISOString();
}

/** Resolve when a review email should send (for backfill on older orders). */
export function resolveReviewEmailDueAt(
  order: Pick<Order, "status" | "deliveredAt" | "reviewEmailDueAt" | "reviewEmailSentAt" | "statusHistory">
): string | null {
  if (order.reviewEmailSentAt) return null;
  if (order.reviewEmailDueAt) return order.reviewEmailDueAt;
  if (order.deliveredAt) return reviewEmailDueAtFrom(order.deliveredAt);
  if (!isDeliveredStatus(order.status)) return null;

  const deliveredEntry = order.statusHistory
    ?.slice()
    .reverse()
    .find((h) => h.status === ORDER_STATUS.DELIVERED || h.status === ORDER_STATUS.COMPLETE);

  if (deliveredEntry?.at) return reviewEmailDueAtFrom(deliveredEntry.at);
  return null;
}

export function isReviewEmailDue(
  order: Pick<Order, "status" | "deliveredAt" | "reviewEmailDueAt" | "reviewEmailSentAt" | "statusHistory">,
  now = new Date()
): boolean {
  const dueAt = resolveReviewEmailDueAt(order);
  if (!dueAt || !isDeliveredStatus(order.status)) return false;
  return new Date(dueAt).getTime() <= now.getTime();
}
