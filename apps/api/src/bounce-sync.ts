import type { ScheduledEvent, Context } from "aws-lambda";
import { processMarketingBounceSync } from "./handlers/ses-email";

/**
 * Hourly: scan failed/bounced marketing recipients and add hard bounces
 * to SUPPRESS# so the next import/campaign send skips them automatically.
 * Mailercloud webhook also suppresses in real time via POST /webhooks/mailercloud.
 */
export async function handler(_event: ScheduledEvent, _context: Context) {
  const result = await processMarketingBounceSync();
  console.log("[bounce-sync]", result);
  return result;
}
