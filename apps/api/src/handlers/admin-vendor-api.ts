/**
 * Admin console proxy for Orange County Vendor API.
 * Cognito admin auth → injects ORANGE_COUNTY_VENDOR_API_KEY → reuses vendor handlers.
 * Never exposes the vendor key to the browser.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { requireAdmin } from "../lib/auth";
import { badRequest, forbidden, ok } from "../lib/response";
import {
  listOrangeCountyOrders,
  getOrangeCountyOrder,
  postOrangeCountyShipmentByBody,
  postOrangeCountyTrackingByBody,
} from "./vendor-orders";

type VendorHandler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

const PUBLIC_VENDOR_BASE = "https://orange-county.spicycenter.com";

function vendorApiKey(): string | null {
  const key = process.env.ORANGE_COUNTY_VENDOR_API_KEY?.trim();
  return key || null;
}

function withVendorKey(
  event: APIGatewayProxyEventV2,
  key: string | null
): APIGatewayProxyEventV2 {
  const headers = { ...(event.headers ?? {}) };
  if (key) {
    headers["x-vendor-api-key"] = key;
    headers["X-Vendor-Api-Key"] = key;
  } else {
    delete headers["x-vendor-api-key"];
    delete headers["X-Vendor-Api-Key"];
  }
  return { ...event, headers };
}

function parseHandlerResult(result: APIGatewayProxyResultV2): {
  statusCode: number;
  body: unknown;
} {
  if (typeof result === "string") {
    try {
      return { statusCode: 200, body: JSON.parse(result) };
    } catch {
      return { statusCode: 200, body: result };
    }
  }
  const statusCode = result.statusCode ?? 200;
  const raw = result.body ?? "";
  if (!raw) return { statusCode, body: null };
  try {
    return { statusCode, body: JSON.parse(raw) };
  } catch {
    return { statusCode, body: raw };
  }
}

async function proxyVendor(
  event: APIGatewayProxyEventV2,
  handler: VendorHandler,
  meta: { action: string; vendorPath: string }
) {
  if (!requireAdmin(event)) return forbidden();
  const key = vendorApiKey();
  if (!key) return badRequest("ORANGE_COUNTY_VENDOR_API_KEY is not configured on the API");

  const result = await handler(withVendorKey(event, key));
  const parsed = parseHandlerResult(result);
  return ok({
    action: meta.action,
    publicBaseUrl: PUBLIC_VENDOR_BASE,
    vendorPath: meta.vendorPath,
    statusCode: parsed.statusCode,
    body: parsed.body,
  });
}

/** Same payload as dedicated Vendor API GET /health. */
export async function adminVendorHealth(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  return ok({
    action: "health",
    publicBaseUrl: PUBLIC_VENDOR_BASE,
    vendorPath: "/health",
    statusCode: 200,
    body: { ok: true, service: "orange-county-vendor-api" },
  });
}

/** Prove vendor auth rejects missing key (expected 401). */
export async function adminVendorAuthCheck(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const stripped = withVendorKey(
    {
      ...event,
      queryStringParameters: {
        ...(event.queryStringParameters ?? {}),
        days: "15",
        limit: "1",
      },
    },
    null
  );
  const result = await listOrangeCountyOrders(stripped);
  const parsed = parseHandlerResult(result);
  const passed = parsed.statusCode === 401;
  return ok({
    action: "auth-check",
    publicBaseUrl: PUBLIC_VENDOR_BASE,
    vendorPath: "/vendors/orange-county/orders?days=15&limit=1",
    expectedStatus: 401,
    statusCode: parsed.statusCode,
    passed,
    body: parsed.body,
  });
}

export async function adminVendorListOrders(event: APIGatewayProxyEventV2) {
  const qs = event.queryStringParameters ?? {};
  const params = new URLSearchParams();
  for (const key of ["days", "limit", "cursor", "status", "since", "updatedSince"] as const) {
    const v = qs[key]?.trim();
    if (v) params.set(key, v);
  }
  const qsStr = params.toString();
  return proxyVendor(event, listOrangeCountyOrders, {
    action: "list-orders",
    vendorPath: `/vendors/orange-county/orders${qsStr ? `?${qsStr}` : ""}`,
  });
}

export async function adminVendorGetOrder(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId?.trim();
  if (!orderId) return badRequest("orderId required");
  return proxyVendor(event, getOrangeCountyOrder, {
    action: "get-order",
    vendorPath: `/vendors/orange-county/orders/${encodeURIComponent(orderId)}`,
  });
}

export async function adminVendorPostShipment(event: APIGatewayProxyEventV2) {
  return proxyVendor(event, postOrangeCountyShipmentByBody, {
    action: "shipment",
    vendorPath: "/vendors/orange-county/shipment",
  });
}

export async function adminVendorPostTracking(event: APIGatewayProxyEventV2) {
  return proxyVendor(event, postOrangeCountyTrackingByBody, {
    action: "tracking",
    vendorPath: "/vendors/orange-county/tracking",
  });
}
