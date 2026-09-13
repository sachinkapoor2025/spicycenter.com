import type { APIGatewayProxyResultV2 } from "aws-lambda";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Session-Id, X-Vendor-Api-Key",
};

export function json(
  statusCode: number,
  body: unknown,
  extraHeaders?: Record<string, string>
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

/** Browsers require 2xx on CORS preflight — API Gateway forwards OPTIONS to Lambda. */
export function corsPreflight(): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: "",
  };
}

export function ok(body: unknown, extraHeaders?: Record<string, string>) {
  return json(200, body, extraHeaders);
}

/** Cacheable catalog responses (browser / CDN). Keep short so admin edits show up soon. */
export function okCached(body: unknown, maxAgeSeconds = 30) {
  return ok(body, {
    // Avoid long stale-while-revalidate — it kept listing prices at old values while PDPs were fresh.
    "Cache-Control": `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${Math.min(30, maxAgeSeconds)}`,
  });
}

export function accepted(body: unknown) {
  return json(202, body);
}

export function created(body: unknown) {
  return json(201, body);
}

export function badRequest(message: string) {
  return json(400, { error: message });
}

export function unauthorized(message = "Unauthorized") {
  return json(401, { error: message });
}

export function forbidden(message = "Forbidden") {
  return json(403, { error: message });
}

export function notFound(message = "Not found") {
  return json(404, { error: message });
}

export function serverError(message = "Internal server error") {
  return json(500, { error: message });
}

/** Upstream dependency failure (SES, SMTP, etc.) with an actionable message. */
export function badGateway(message: string) {
  return json(502, { error: message });
}
