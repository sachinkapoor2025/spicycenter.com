import type { EventBridgeEvent } from "aws-lambda";
import { optimizeObject } from "./lib/optimize-image";

type S3ObjectCreatedDetail = {
  bucket?: { name?: string };
  object?: { key?: string; size?: number };
};

type DirectInvoke = {
  bucket?: string;
  key?: string;
  backfill?: boolean;
};

/**
 * Upload-time image optimizer.
 * Triggered by EventBridge on S3 Object Created (not Lambda@Edge) so peak
 * storefront traffic never pays for resize — variants are generated once.
 */
export async function handler(
  event: EventBridgeEvent<"Object Created", S3ObjectCreatedDetail> | DirectInvoke
): Promise<{ ok: boolean; result?: unknown }> {
  const bucket =
    "detail" in event
      ? event.detail?.bucket?.name
      : event.bucket ?? process.env.UPLOAD_BUCKET;
  const key = "detail" in event ? event.detail?.object?.key : event.key;

  if (!bucket || !key) {
    console.warn("[image-optimize] missing bucket/key", { hasDetail: "detail" in event });
    return { ok: false };
  }

  const result = await optimizeObject(bucket, key);
  return { ok: true, result };
}
