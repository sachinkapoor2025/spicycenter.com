import type { Context } from "aws-lambda";
import { processCjImportJob } from "./lib/cj-import-job";

type WorkerEvent = {
  jobId?: string;
};

export async function handler(event: WorkerEvent, context: Context) {
  const jobId = event?.jobId;
  if (!jobId) {
    console.error("CJ import worker missing jobId");
    return { ok: false };
  }
  const job = await processCjImportJob(jobId, () => context.getRemainingTimeInMillis());
  return { ok: true, jobId, status: job?.status };
}
