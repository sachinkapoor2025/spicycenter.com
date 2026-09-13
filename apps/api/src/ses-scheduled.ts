import type { ScheduledEvent, Context } from "aws-lambda";
import { processSesEmailJobs } from "./handlers/ses-email";

/** EventBridge — every minute: due campaigns + SES queue batches. */
export async function handler(_event: ScheduledEvent, _context: Context) {
  return processSesEmailJobs();
}
