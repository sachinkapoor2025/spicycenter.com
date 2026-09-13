import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  buildOrderRouteListItem,
  buildOrderRoutePayload,
  eventKeys,
  orderKeys,
  type Order,
  type RawAnalyticsEvent,
} from "@spicycorner/shared";
import { requireAdmin } from "../lib/auth";
import { docClient, ORDERS_TABLE, EVENTS_TABLE } from "../lib/db";
import { ok, badRequest, forbidden, notFound } from "../lib/response";

async function loadSessionEvents(sessionId: string): Promise<RawAnalyticsEvent[]> {
  const items: RawAnalyticsEvent[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: EVENTS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": eventKeys.pk(sessionId) },
        ScanIndexForward: true,
        ExclusiveStartKey,
        Limit: 400,
      })
    );
    for (const item of res.Items ?? []) {
      items.push({
        eventId: item.eventId as string | undefined,
        type: item.type as string | undefined,
        createdAt: item.createdAt as string | undefined,
        at: item.at as string | undefined,
        path: item.path as string | undefined,
        productSlug: item.productSlug as string | undefined,
        referrer: item.referrer as string | undefined,
        metadata: item.metadata as Record<string, string> | undefined,
      });
    }
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    // Cap journey reconstruction to keep admin responses snappy
    if (items.length >= 500) break;
  } while (ExclusiveStartKey);
  return items;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Admin overview: checkout snapshots when present; otherwise reconstruct from
 * session events (bounded) so older orders still show useful route fields.
 */
export async function listAdminOrderRoutes(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const items: Order[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
        ScanIndexForward: false,
        ExclusiveStartKey,
        Limit: 100,
      })
    );
    items.push(...((result.Items ?? []) as Order[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (ExclusiveStartKey && pages < 30);

  // Newest orders missing a checkout snapshot — backfill from analytics events.
  const needsEvents = items
    .filter(
      (o) =>
        o.sessionId &&
        !(o.attribution?.firstTouch || o.attribution?.lastTouch)
    )
    .slice(0, 120);

  const eventsByOrderId = new Map<string, RawAnalyticsEvent[]>();
  await mapPool(needsEvents, 10, async (order) => {
    const events = await loadSessionEvents(order.sessionId!);
    eventsByOrderId.set(order.orderId, events);
    return null;
  });

  const routes = items.map((order) =>
    buildOrderRouteListItem(order, eventsByOrderId.get(order.orderId) ?? [])
  );

  const bySource = new Map<string, number>();
  let withSnapshot = 0;
  let fromEvents = 0;
  let none = 0;
  for (const r of routes) {
    const key = (r.lastSource || r.firstSource || "unknown").toLowerCase();
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
    if (r.attributionOrigin === "checkout_snapshot") withSnapshot += 1;
    else if (r.attributionOrigin === "session_events") fromEvents += 1;
    else none += 1;
  }

  return ok({
    routes,
    count: routes.length,
    coverage: { withSnapshot, fromEvents, none },
    bySource: [...bySource.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  });
}

/** Admin: full Order Route / attribution journey for one order. */
export async function getAdminOrderRoute(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const orderId = event.pathParameters?.orderId?.trim();
  if (!orderId) return badRequest("orderId required");

  const orderRes = await docClient.send(
    new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
    })
  );
  if (!orderRes.Item) return notFound("Order not found");

  const order = orderRes.Item as Order;
  const sessionId = order.sessionId?.trim();
  const events = sessionId ? await loadSessionEvents(sessionId) : [];

  const payload = buildOrderRoutePayload(order, events);
  return ok(payload);
}
