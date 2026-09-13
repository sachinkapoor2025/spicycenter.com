import type { Context } from "aws-lambda";
import { processDueReviewEmails } from "./handlers/review-emails";
import { processAbandonedCartEmails } from "./handlers/abandoned-cart-emails";
import { processPendingPaymentReminders } from "./handlers/pending-payment-reminders";
import { reconcilePendingRazorpayPayments } from "./handlers/payments/razorpay";
import { runPaymentReconciliationJob } from "./handlers/payment-reconciliation";
import { refreshHomepageSnapshot } from "./handlers/homepage-ranking";

type CronEvent = {
  task?: string;
};

/** EventBridge schedules → review/abandoned/pending (15m) or Razorpay reconcile (1h). */
export async function handler(event: CronEvent, _context: Context) {
  if (event?.task === "razorpayReconcile") {
    try {
      const razorpayReconcile = await reconcilePendingRazorpayPayments();
      return { razorpayReconcile };
    } catch (err) {
      console.error("Razorpay reconcile cron failed:", err);
      throw err;
    }
  }

  if (event?.task === "homepageRanking") {
    try {
      const snapshot = await refreshHomepageSnapshot();
      return { homepageRanking: { poolSize: snapshot.poolSize, generatedAt: snapshot.generatedAt } };
    } catch (err) {
      console.error("Homepage ranking cron failed:", err);
      throw err;
    }
  }

  if (event?.task === "paymentReconciliation") {
    try {
      const paymentReconciliation = await runPaymentReconciliationJob();
      return { paymentReconciliation };
    } catch (err) {
      console.error("Payment reconciliation cron failed:", err);
      throw err;
    }
  }

  const results: Record<string, unknown> = {};

  try {
    results.reviewEmails = await processDueReviewEmails();
  } catch (err) {
    console.error("Review emails cron failed:", err);
    results.reviewEmailsError = err instanceof Error ? err.message : String(err);
  }

  try {
    results.abandonedCartEmails = await processAbandonedCartEmails();
  } catch (err) {
    console.error("Abandoned cart emails cron failed:", err);
    results.abandonedCartEmailsError = err instanceof Error ? err.message : String(err);
  }

  try {
    results.pendingPaymentReminders = await processPendingPaymentReminders();
  } catch (err) {
    console.error("Pending payment reminders cron failed:", err);
    results.pendingPaymentRemindersError = err instanceof Error ? err.message : String(err);
  }

  // Best-effort reconciliation snapshot log (does not fail the email cron).
  try {
    results.paymentReconciliation = await runPaymentReconciliationJob();
  } catch (err) {
    console.error("Payment reconciliation (inline) failed:", err);
    results.paymentReconciliationError = err instanceof Error ? err.message : String(err);
  }

  if (
    results.reviewEmailsError ||
    results.abandonedCartEmailsError ||
    results.pendingPaymentRemindersError
  ) {
    throw new Error(JSON.stringify(results));
  }

  return results;
}
