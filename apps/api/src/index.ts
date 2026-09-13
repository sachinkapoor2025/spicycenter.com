import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import { route } from "./router";

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return "Internal server error";
}

export async function handler(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  try {
    return await route(event);
  } catch (err) {
    const message = errorMessage(err);
    console.error("Unhandled API error:", {
      path: event.rawPath ?? event.requestContext?.http?.path,
      method: event.requestContext?.http?.method,
      message,
      err,
    });
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
      },
      body: JSON.stringify({ error: message }),
    };
  }
}
