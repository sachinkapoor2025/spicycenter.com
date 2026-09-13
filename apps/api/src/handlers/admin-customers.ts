import { QueryCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  cartKeys,
  customerKeys,
  eventKeys,
  orderKeys,
  normalizeEmail,
  normalizePhone,
  type CartItem,
  type Order,
} from "@spicycorner/shared";
import {
  docClient,
  ORDERS_TABLE,
  CUSTOMERS_TABLE,
  CARTS_TABLE,
  CONFIG_TABLE,
  EVENTS_TABLE,
} from "../lib/db";
import { ok, badRequest, forbidden } from "../lib/response";
import { requireAdmin } from "../lib/auth";

/**
 * Unified customer profile by email (Section 2).
 * Aggregates orders, leads, carts, welcome coupons, and visitor sessions.
 */
export async function getCustomerProfile(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const rawEmail = event.pathParameters?.email
    ? decodeURIComponent(event.pathParameters.email)
    : event.queryStringParameters?.email;
  const email = normalizeEmail(rawEmail);
  if (!email) return badRequest("Valid email required");

  const [orders, leads, carts, coupons] = await Promise.all([
    fetchOrdersByEmail(email),
    fetchLeadsByEmail(email),
    fetchCartsByEmail(email),
    fetchWelcomeCouponsByEmail(email),
  ]);

  const sessionIds = new Set<string>();
  for (const lead of leads) {
    if (lead.sessionId) sessionIds.add(lead.sessionId);
  }
  for (const cart of carts) {
    if (cart.sessionId) sessionIds.add(cart.sessionId);
  }
  for (const order of orders) {
    if (order.sessionId) sessionIds.add(order.sessionId);
  }
  for (const c of coupons) {
    if (c.sessionId) sessionIds.add(c.sessionId);
  }

  const sessions = await Promise.all([...sessionIds].slice(0, 40).map((id) => fetchSessionSummary(id)));

  const name =
    orders[0]?.shippingAddress?.name ??
    leads.find((l) => l.name)?.name ??
    carts.find((c) => c.name)?.name;
  const phone =
    orders[0]?.shippingAddress?.phone ??
    leads.find((l) => l.phone)?.phone ??
    carts.find((c) => c.phone)?.phone;

  const paidOrders = orders.filter(
    (o) => !["pending_payment", "cancelled", "refunded"].includes(o.status)
  );
  const lifetimeValueByCurrency: Record<string, number> = {};
  for (const o of paidOrders) {
    lifetimeValueByCurrency[o.currency] =
      (lifetimeValueByCurrency[o.currency] ?? 0) + o.total;
  }

  const lastActivityCandidates = [
    ...orders.map((o) => o.updatedAt ?? o.createdAt),
    ...leads.map((l) => l.createdAt),
    ...carts.map((c) => c.updatedAt),
    ...sessions.map((s) => s?.lastSeen).filter(Boolean) as string[],
  ].filter(Boolean) as string[];
  const lastActivity = lastActivityCandidates.sort().at(-1) ?? null;

  return ok({
    customer: {
      email,
      name: name ?? null,
      phone: phone ?? null,
      orderCount: paidOrders.length,
      lifetimeValueByCurrency,
      lastActivity,
    },
    orders,
    leads,
    abandonedCarts: carts,
    welcomeCoupons: coupons,
    sessions: sessions.filter(Boolean),
  });
}

/** Lightweight global admin search across orders, leads, carts, visitors. */
export async function adminSearch(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const q = (event.queryStringParameters?.q ?? "").trim().toLowerCase();
  if (q.length < 2) return badRequest("Query must be at least 2 characters");

  const phoneKey = normalizePhone(q);
  const emailKey = normalizeEmail(q);

  const [ordersRes, leadsRes, cartsRes] = await Promise.all([
    docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
        ScanIndexForward: false,
        Limit: 150,
      })
    ),
    docClient.send(
      new QueryCommand({
        TableName: CUSTOMERS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
        ScanIndexForward: false,
        Limit: 150,
      })
    ),
    docClient.send(
      new QueryCommand({
        TableName: CARTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": cartKeys.gsi1pk() },
        ScanIndexForward: false,
        Limit: 100,
      })
    ),
  ]);

  const orders = ((ordersRes.Items ?? []) as Order[])
    .filter((o) => {
      const addr = o.shippingAddress;
      return (
        o.orderId.toLowerCase().includes(q) ||
        addr?.name?.toLowerCase().includes(q) ||
        addr?.email?.toLowerCase().includes(q) ||
        (phoneKey && normalizePhone(addr?.phone) === phoneKey) ||
        (emailKey && normalizeEmail(addr?.email) === emailKey)
      );
    })
    .slice(0, 10)
    .map((o) => ({
      type: "order" as const,
      id: o.orderId,
      label: o.shippingAddress?.name ?? o.orderId,
      email: o.shippingAddress?.email,
      href: `/admin/orders/${o.orderId}`,
      profileHref: o.shippingAddress?.email
        ? `/admin/customers/${encodeURIComponent(o.shippingAddress.email)}`
        : undefined,
    }));

  const leads = ((leadsRes.Items ?? []) as Record<string, unknown>[])
    .filter((l) => {
      return (
        String(l.name ?? "")
          .toLowerCase()
          .includes(q) ||
        String(l.email ?? "")
          .toLowerCase()
          .includes(q) ||
        (phoneKey && normalizePhone(l.phone as string) === phoneKey) ||
        (emailKey && normalizeEmail(l.email as string) === emailKey)
      );
    })
    .slice(0, 10)
    .map((l) => ({
      type: "lead" as const,
      id: String(l.leadId ?? l.SK),
      label: (l.name as string) || (l.email as string) || "Lead",
      email: l.email as string | undefined,
      href: "/admin/leads",
      profileHref: l.email
        ? `/admin/customers/${encodeURIComponent(String(l.email))}`
        : undefined,
    }));

  const carts = ((cartsRes.Items ?? []) as Record<string, unknown>[])
    .filter((c) => Number(c.itemCount ?? 0) > 0)
    .slice(0, 30);

  const cartResults: {
    type: "cart";
    id: string;
    label: string;
    email?: string;
    href: string;
    profileHref?: string;
  }[] = [];

  for (const c of carts) {
    const sid = (c.sessionId as string) ?? (c.userKey as string);
    if (!sid) continue;
    const profile = await docClient.send(
      new GetCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { PK: customerKeys.pk(sid), SK: customerKeys.profileSk() },
      })
    );
    const name = profile.Item?.name as string | undefined;
    const email = profile.Item?.email as string | undefined;
    const phone = profile.Item?.phone as string | undefined;
    const match =
      name?.toLowerCase().includes(q) ||
      email?.toLowerCase().includes(q) ||
      (phoneKey && normalizePhone(phone) === phoneKey) ||
      (emailKey && normalizeEmail(email) === emailKey);
    if (!match) continue;
    cartResults.push({
      type: "cart",
      id: sid,
      label: name || email || sid.slice(0, 8),
      email,
      href: "/admin/carts",
      profileHref: email ? `/admin/customers/${encodeURIComponent(email)}` : undefined,
    });
    if (cartResults.length >= 8) break;
  }

  return ok({
    q,
    results: [...orders, ...leads, ...cartResults],
  });
}

async function fetchOrdersByEmail(email: string): Promise<Order[]> {
  const items: Order[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
        Limit: 200,
      })
    );
    for (const o of (res.Items ?? []) as Order[]) {
      if (normalizeEmail(o.shippingAddress?.email) === email) items.push(o);
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey && items.length < 100);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function fetchLeadsByEmail(email: string) {
  const res = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
      ScanIndexForward: false,
      Limit: 400,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[])
    .filter((l) => normalizeEmail(l.email as string) === email)
    .map((l) => ({
      leadId: l.leadId as string | undefined,
      sessionId: (l.sessionId as string) ?? String(l.PK ?? "").replace(/^SESSION#/, ""),
      name: l.name as string | undefined,
      email: l.email as string | undefined,
      phone: l.phone as string | undefined,
      source: l.source as string | undefined,
      page: l.page as string | undefined,
      status: l.status as string | undefined,
      notes: l.notes as string | undefined,
      assignedTo: l.assignedTo as string | undefined,
      createdAt: (l.createdAt as string) ?? "",
    }));
}

async function fetchCartsByEmail(email: string) {
  const res = await docClient.send(
    new QueryCommand({
      TableName: CARTS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": cartKeys.gsi1pk() },
      ScanIndexForward: false,
      Limit: 200,
    })
  );

  const out: {
    sessionId: string;
    itemCount: number;
    value: number;
    currency?: string;
    createdAt: string;
    updatedAt: string;
    items: CartItem[];
    name?: string;
    email?: string;
    phone?: string;
    convertedOrderId?: string;
    converted: boolean;
  }[] = [];

  for (const c of (res.Items ?? []) as Record<string, unknown>[]) {
    if (Number(c.itemCount ?? 0) <= 0 && !c.convertedOrderId) continue;
    const sid = (c.sessionId as string) ?? (c.userKey as string);
    if (!sid) continue;
    const profile = await docClient.send(
      new GetCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { PK: customerKeys.pk(sid), SK: customerKeys.profileSk() },
      })
    );
    const profileEmail = normalizeEmail(profile.Item?.email as string | undefined);
    if (profileEmail !== email) continue;
    out.push({
      sessionId: sid,
      itemCount: Number(c.itemCount ?? 0),
      value: Number(c.value ?? 0),
      currency: c.currency as string | undefined,
      createdAt: (c.createdAt as string) ?? "",
      updatedAt: (c.updatedAt as string) ?? "",
      items: (c.items as CartItem[]) ?? [],
      name: profile.Item?.name as string | undefined,
      email: profileEmail,
      phone: profile.Item?.phone as string | undefined,
      convertedOrderId: c.convertedOrderId as string | undefined,
      converted: Boolean(c.convertedOrderId),
    });
  }
  return out;
}

async function fetchWelcomeCouponsByEmail(email: string) {
  const res = await docClient.send(
    new ScanCommand({
      TableName: CONFIG_TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #src = :src AND email = :email",
      ExpressionAttributeNames: { "#src": "source" },
      ExpressionAttributeValues: {
        ":prefix": "COUPON#",
        ":sk": "META",
        ":src": "welcome",
        ":email": email,
      },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((c) => ({
    code: c.code as string,
    email: c.email as string,
    discountPercent: c.discountPercent as number,
    expiresAt: c.expiresAt as string,
    createdAt: c.createdAt as string,
    usedAt: c.usedAt as string | undefined,
    orderId: c.orderId as string | undefined,
    sessionId: c.sessionId as string | undefined,
  }));
}

async function fetchSessionSummary(sessionId: string) {
  const eventsRes = await docClient.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": eventKeys.pk(sessionId) },
      ScanIndexForward: true,
      Limit: 200,
    })
  );
  const events = (eventsRes.Items ?? []) as Record<string, unknown>[];
  if (events.length === 0) {
    const profile = await docClient.send(
      new GetCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { PK: customerKeys.pk(sessionId), SK: customerKeys.profileSk() },
      })
    );
    if (!profile.Item) return null;
    return {
      sessionId,
      firstSeen: (profile.Item.createdAt as string) ?? "",
      lastSeen: (profile.Item.lastSeenAt as string) ?? "",
      eventCount: 0,
      landingPage: undefined as string | undefined,
      exitPage: undefined as string | undefined,
    };
  }
  const first = events[0];
  const last = events[events.length - 1];
  return {
    sessionId,
    firstSeen: (first.createdAt as string) ?? (first.at as string) ?? "",
    lastSeen: (last.createdAt as string) ?? (last.at as string) ?? "",
    eventCount: events.length,
    landingPage: first.path as string | undefined,
    exitPage: last.path as string | undefined,
  };
}
