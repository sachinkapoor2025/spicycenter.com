/**
 * Dedicated Orange County vendor API entrypoint.
 * Only vendor fulfillment routes are registered — not the storefront/admin API.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import {
  listOrangeCountyOrders,
  getOrangeCountyOrder,
  postOrangeCountyShipment,
  postOrangeCountyTracking,
  postOrangeCountyShipmentByBody,
  postOrangeCountyTrackingByBody,
} from "./handlers/vendor-orders";

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

const routes: Array<{
  method: string;
  pattern: RegExp;
  handler: Handler;
  params?: string[];
}> = [
  {
    method: "GET",
    pattern: /^\/vendors\/orange-county\/orders$/,
    handler: listOrangeCountyOrders,
  },
  {
    method: "GET",
    pattern: /^\/vendors\/orange-county\/orders\/([^/]+)$/,
    handler: getOrangeCountyOrder,
    params: ["orderId"],
  },
  {
    method: "POST",
    pattern: /^\/vendors\/orange-county\/orders\/([^/]+)\/shipment$/,
    handler: postOrangeCountyShipment,
    params: ["orderId"],
  },
  {
    method: "POST",
    pattern: /^\/vendors\/orange-county\/orders\/([^/]+)\/tracking$/,
    handler: postOrangeCountyTracking,
    params: ["orderId"],
  },
  {
    method: "POST",
    pattern: /^\/vendors\/orange-county\/shipment$/,
    handler: postOrangeCountyShipmentByBody,
  },
  {
    method: "POST",
    pattern: /^\/vendors\/orange-county\/tracking$/,
    handler: postOrangeCountyTrackingByBody,
  },
  {
    method: "GET",
    pattern: /^\/health$/,
    handler: async () => ({
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, service: "orange-county-vendor-api" }),
    }),
  },
];

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Vendor-Api-Key",
  };
}

export async function handler(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method ?? "GET";
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  let path = event.rawPath ?? event.requestContext?.http?.path ?? "/";
  const stage = event.requestContext?.stage;
  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1);
  } else if (stage && path === `/${stage}`) {
    path = "/";
  }

  try {
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = path.match(route.pattern);
      if (!match) continue;
      if (route.params?.length) {
        const params: Record<string, string> = {};
        route.params.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        event.pathParameters = { ...(event.pathParameters ?? {}), ...params };
      }
      return await route.handler(event);
    }
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    console.error("Vendor API error", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
    };
  }
}
