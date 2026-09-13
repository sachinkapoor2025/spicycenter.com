import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { LOAD_TEST_PRESETS, loadTestRunRequestSchema, loadTestLimits } from "@spicycorner/shared";
import { requireSuperAdmin } from "../lib/auth";
import { isLoadTestMode } from "../lib/load-test";
import { badRequest, forbidden, ok } from "../lib/response";

/**
 * Super-admin only: prefer the browser runner at /admin/load-test.
 * Server-side run stays capped (self-invoke concurrency trap).
 */
export async function runLoadTest(event: APIGatewayProxyEventV2) {
  if (!requireSuperAdmin(event)) return forbidden("Super admin required");

  let body: unknown = {};
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = loadTestRunRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  return badRequest(
    `Use the Admin UI browser runner for preset "${parsed.data.preset}". ` +
      "Server-side orchestration from this Lambda causes self-throttle 503s under load."
  );
}

/** Super-admin: report whether payment/email stubs are active. */
export async function getLoadTestInfo(_event: APIGatewayProxyEventV2) {
  if (!requireSuperAdmin(_event)) return forbidden("Super admin required");
  return ok({
    loadTestMode: isLoadTestMode(),
    presets: LOAD_TEST_PRESETS,
    limits: {
      presets: Object.fromEntries(
        (Object.keys(LOAD_TEST_PRESETS) as (keyof typeof LOAD_TEST_PRESETS)[]).map((k) => [
          k,
          loadTestLimits(k),
        ])
      ),
    },
    note:
      "Runs from your browser. Presets Smoke → 1000 users use tiered p95 limits (higher load allows higher latency). For true 1000 VU use scripts/load + k6 on staging.",
  });
}
