import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import { getLatestPrice, getPriceHistory } from "./handlers/spice-prices";
import { corsPreflight, notFound } from "./lib/response";

const ALLOWED = new Set([
  "https://spicycenter.com",
  "https://www.spicycenter.com",
]);

function origin(event: APIGatewayProxyEventV2): string {
  const o = event.headers?.origin ?? event.headers?.Origin ?? "";
  return ALLOWED.has(o) ? o : "https://www.spicycenter.com";
}

function withOrigin(event: APIGatewayProxyEventV2, res: APIGatewayProxyResultV2): APIGatewayProxyResultV2 {
  return {
    ...res,
    headers: {
      ...(res.headers ?? {}),
      "Access-Control-Allow-Origin": origin(event),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  };
}

export async function handler(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  let path = event.rawPath ?? "/";
  const stage = event.requestContext.stage;
  if (stage && path.startsWith(`/${stage}/`)) path = path.slice(stage.length + 1);
  const method = event.requestContext.http.method;
  if (method === "OPTIONS") return withOrigin(event, corsPreflight());

  const history = path.match(/^\/prices\/([^/]+)\/history$/);
  if (method === "GET" && history) {
    event.pathParameters = { ...event.pathParameters, commodity: history[1] };
    return withOrigin(event, await getPriceHistory(event));
  }
  const latest = path.match(/^\/prices\/([^/]+)$/);
  if (method === "GET" && latest) {
    event.pathParameters = { ...event.pathParameters, commodity: latest[1] };
    return withOrigin(event, await getLatestPrice(event));
  }
  return withOrigin(event, notFound(`Route not found: ${method} ${path}`));
}
