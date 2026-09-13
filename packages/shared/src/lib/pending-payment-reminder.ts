import { ORDER_STATUS } from "../constants";
import type { Order } from "../schemas/order";

/**
 * Last calendar day (America/New_York) to send pending-payment reminders.
 * Reminders send through this date inclusive; campaign stops after.
 */
export const PENDING_PAYMENT_REMINDER_END_DATE = "2026-08-28";

/** Wait before the first reminder so checkout isn't followed by an immediate nudge. */
export const PENDING_PAYMENT_REMINDER_MIN_AGE_MS = 2 * 60 * 60 * 1000;

/** YYYY-MM-DD in America/New_York. */
export function calendarDateKeyNy(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** Inclusive: reminders run through end of Aug 28 NY time. */
export function isPendingPaymentReminderCampaignActive(now = new Date()): boolean {
  return calendarDateKeyNy(now) <= PENDING_PAYMENT_REMINDER_END_DATE;
}

export function shouldSendPendingPaymentReminder(
  order: Pick<
    Order,
    | "status"
    | "createdAt"
    | "pendingPaymentReminderLastSentAt"
    | "pendingPaymentReminderLastDateKey"
    | "shippingAddress"
  >,
  now = new Date()
): boolean {
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) return false;
  if (!isPendingPaymentReminderCampaignActive(now)) return false;

  const email = order.shippingAddress?.email?.trim();
  if (!email?.includes("@")) return false;

  const createdMs = new Date(order.createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  if (now.getTime() - createdMs < PENDING_PAYMENT_REMINDER_MIN_AGE_MS) return false;

  const today = calendarDateKeyNy(now);
  if (order.pendingPaymentReminderLastDateKey === today) return false;

  // Back-compat if only ISO timestamp was stored.
  const last = order.pendingPaymentReminderLastSentAt;
  if (last && calendarDateKeyNy(new Date(last)) === today) return false;

  return true;
}
