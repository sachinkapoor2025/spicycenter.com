/**
 * Orange County vendor fulfillment API (dedicated VendorHttpApi only).
 *
 * GET  /vendors/orange-county/orders
 * GET  /vendors/orange-county/orders/{orderId}
 * POST /vendors/orange-county/orders/{orderId}/shipment   (AWB + courier)
 * POST /vendors/orange-county/orders/{orderId}/tracking   (status updates)
 * POST /vendors/orange-county/shipment                   (body-only: orderNumber + AWB)
 * POST /vendors/orange-county/tracking                   (body-only: orderNumber + status)
 *
 * Auth: X-Vendor-Api-Key
 *
 * Item `price` / order `orderValue` are vendor fulfill / purchase amounts (vendorCost),
 * not SpicyCenter retail selling prices.
 */
import { GetCommand, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  VENDOR_ORANGE_COUNTY,
  VENDOR_ORDERS_DEFAULT_DAYS,
  VENDOR_ORDERS_DEFAULT_LIMIT,
  VENDOR_ORDERS_MAX_LIMIT,
  orderKeys,
  productKeys,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  resolveProductImageUrl,
  vendorShipmentUpdateSchema,
  vendorTrackingUpdateSchema,
  displayOrderRef,
  ensureVendorFulfillments,
  upsertVendorFulfillment,
  primaryTrackingFromFulfillments,
  allVendorsHaveTracking,
  anyVendorHasTracking,
  isMultiVendorOrder,
  type Order,
  type CartItem,
  type OrderStatusHistoryEntry,
  type VendorFulfillment,
} from "@spicycorner/shared";
import { docClient, ORDERS_TABLE, PRODUCTS_TABLE, now } from "../lib/db";
import { ok, unauthorized, badRequest, forbidden, notFound } from "../lib/response";
import { getBundledOrangeCountyProduct } from "../lib/orange-county-catalog";
import { notifyCustomerOrderStatusChange } from "../lib/email";
import { applyDeliveryReviewSchedule } from "./review-emails";
import { resolveOrderByIdOrNumber } from "../lib/order-numbers";

/** Hard cap on Dynamo rows scanned per list request (across pages). */
const MAX_SCAN_PER_REQUEST = 5000;

type StoredOrder = Order & {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
  createdAt: string;
  updatedAt: string;
};

function vendorApiKeyOk(event: APIGatewayProxyEventV2): boolean {
  const key =
    event.headers?.["x-vendor-api-key"] ??
    event.headers?.["X-Vendor-Api-Key"] ??
    "";
  if (!key) return false;
  const expected = process.env.ORANGE_COUNTY_VENDOR_API_KEY?.trim();
  return Boolean(expected && key === expected);
}

function vendorLineItems(order: Order, vendorSlug: string): CartItem[] {
  return (order.items ?? []).filter((i) => i.vendorSlug === vendorSlug);
}

function orderTouchesVendor(order: Order, vendorSlug: string): boolean {
  if (order.vendorSlugs?.includes(vendorSlug)) return true;
  return (order.items ?? []).some((i) => i.vendorSlug === vendorSlug);
}

function resolveVendorSku(item: CartItem): string {
  const fromLine = item.sku?.trim();
  if (fromLine) return fromLine;
  const bundled = getBundledOrangeCountyProduct(item.productSlug);
  return bundled?.sku?.trim() || item.productSlug;
}

function resolveVendorCost(item: CartItem): number | null {
  const bundled = getBundledOrangeCountyProduct(item.productSlug);
  const cost = bundled?.vendorCost;
  return typeof cost === "number" && cost > 0 ? cost : null;
}

function resolveProductImage(item: CartItem): string {
  if (item.image) return resolveProductImageUrl(item.image);
  const bundled = getBundledOrangeCountyProduct(item.productSlug);
  const first = bundled?.images?.[0];
  return first ? resolveProductImageUrl(first) : "";
}

function resolveWeight(item: CartItem): { weight: number | null; weightUnit: string | null } {
  const bundled = getBundledOrangeCountyProduct(item.productSlug);
  const oz = bundled?.weightOz;
  if (typeof oz === "number" && oz > 0) {
    return { weight: oz, weightUnit: "oz" };
  }

  // Category / set defaults when catalog weight was never imported (vendor asked for weight).
  const slug = item.productSlug.toLowerCase();
  const sku = (item.sku ?? bundled?.sku ?? "").toLowerCase();
  if (/setof?5|set-?of-?5|set5/.test(slug + sku) || /md005set5/.test(sku)) {
    return { weight: 40, weightUnit: "oz" };
  }
  if (/setof?4|set-?of-?4|4-set/.test(slug + sku)) {
    return { weight: 32, weightUnit: "oz" };
  }
  if (/setof?3|set-?of-?3|3-set/.test(slug + sku)) {
    return { weight: 24, weightUnit: "oz" };
  }
  if (/setof?2|set-?of-?2|2-set|setof2/.test(slug + sku)) {
    return { weight: 16, weightUnit: "oz" };
  }
  if (
    bundled?.categorySlug === "rakhi-hampers" ||
    /hamper|combo|dry-fruit|chocolate/.test(slug)
  ) {
    return { weight: 32, weightUnit: "oz" };
  }
  // Single rakhi default
  return { weight: 6, weightUnit: "oz" };
}

async function resolveWeightWithDb(item: CartItem): Promise<{ weight: number | null; weightUnit: string | null }> {
  try {
    const res = await docClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(item.productSlug), SK: productKeys.sk() },
        ProjectionExpression: "weightOz",
      })
    );
    const oz = res.Item?.weightOz;
    if (typeof oz === "number" && oz > 0) {
      return { weight: oz, weightUnit: "oz" };
    }
  } catch {
    /* fall through to catalog/defaults */
  }
  return resolveWeight(item);
}

async function toVendorItem(item: CartItem) {
  const { weight, weightUnit } = await resolveWeightWithDb(item);
  const price = resolveVendorCost(item);
  return {
    sku: resolveVendorSku(item),
    productCode: resolveVendorSku(item),
    productName: item.name,
    productSlug: item.productSlug,
    price,
    quantity: item.quantity,
    productImageUrl: resolveProductImage(item) || null,
    weight,
    weightUnit,
  };
}

async function toVendorOrder(order: Order, items: CartItem[]) {
  const addr = order.shippingAddress;
  const mappedItems = await Promise.all(items.map(toVendorItem));
  const orderValue = mappedItems.reduce((sum, i) => {
    if (i.price == null) return sum;
    return sum + i.price * i.quantity;
  }, 0);
  const hasAllCosts = mappedItems.every((i) => i.price != null);
  const humanNumber = displayOrderRef(order);

  // List and get share this mapper — phone/country are never masked (USPS needs full number).
  const phone = typeof addr.phone === "string" ? addr.phone.trim() : "";
  const country = (typeof addr.country === "string" && addr.country.trim()) || "US";

  return {
    /** Human-readable id for vendor systems (OC10001…). */
    orderId: humanNumber,
    orderNumber: humanNumber,
    /** Internal UUID — keep for support/debugging; prefer orderNumber for tracking. */
    internalOrderId: order.orderId,
    orderDate: order.createdAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    /** Last status pushed by vendor tracking API (raw), when available. */
    currentShipmentStatus: order.vendorShipmentStatus ?? order.status ?? null,
    senderName: addr.senderName ?? null,
    recipientName: addr.name,
    recipientAddressLine1: addr.line1,
    recipientAddressLine2: addr.line2 ?? null,
    city: addr.city,
    state: addr.state,
    country,
    zipCode: addr.postalCode,
    /** Full E.164 / dialed number — not masked (required for USPS labels). */
    recipientPhoneNumber: phone || null,
    recipientEmail: addr.email ?? null,
    /** Total fulfill / purchase amount for OC lines (vendorCost × qty). Not retail. */
    orderValue: hasAllCosts ? Number(orderValue.toFixed(2)) : null,
    orderValueCurrency: "USD",
    deliveryDate: order.estimatedDeliveryAt ?? null,
    giftMessage: addr.senderMessage ?? null,
    trackingNumber: order.trackingNumber ?? null,
    carrier: order.carrier ?? null,
    shippingServiceName: order.shippingServiceName ?? null,
    items: mappedItems,
  };
}

function defaultSinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function loadVendorOrder(orderId: string): Promise<StoredOrder | undefined> {
  return resolveOrderByIdOrNumber(orderId) as Promise<StoredOrder | undefined>;
}

function mapVendorStatus(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    pending_payment: ORDER_STATUS.PENDING_PAYMENT,
    paid: ORDER_STATUS.PAID,
    accepted: ORDER_STATUS.ACCEPTED,
    processing: ORDER_STATUS.PROCESSING,
    packed: ORDER_STATUS.PROCESSING,
    packing: ORDER_STATUS.PROCESSING,
    shipped: ORDER_STATUS.SHIPPED,
    in_transit: ORDER_STATUS.SHIPPED,
    dispatched: ORDER_STATUS.SHIPPED,
    out_for_delivery: ORDER_STATUS.SHIPPED,
    delivered: ORDER_STATUS.DELIVERED,
    complete: ORDER_STATUS.COMPLETE,
    completed: ORDER_STATUS.COMPLETE,
    cancelled: ORDER_STATUS.CANCELLED,
    canceled: ORDER_STATUS.CANCELLED,
    refunded: ORDER_STATUS.REFUNDED,
  };
  return aliases[s] ?? null;
}

function encodeCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

function decodeCursor(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Dynamo ExclusiveStartKey for GSI2 after this order row. */
function gsi2CursorFromOrder(order: StoredOrder): Record<string, unknown> | null {
  if (!order.PK || !order.SK || !order.GSI2PK || !order.GSI2SK) return null;
  return {
    PK: order.PK,
    SK: order.SK,
    GSI2PK: order.GSI2PK,
    GSI2SK: order.GSI2SK,
  };
}

async function persistVendorOrderUpdate(
  order: StoredOrder,
  patch: {
    status?: string;
    trackingNumber?: string;
    carrier?: string;
    vendorShipmentStatus?: string;
    note?: string;
    /** When set, AWB is stored on this vendor lane (does not wipe other vendors). */
    fulfillmentVendorSlug?: string;
  }
) {
  const timestamp = now();

  let vendorFulfillments: VendorFulfillment[] = ensureVendorFulfillments(order);
  if (patch.fulfillmentVendorSlug && (patch.trackingNumber !== undefined || patch.carrier !== undefined)) {
    vendorFulfillments = upsertVendorFulfillment(vendorFulfillments, {
      vendorSlug: patch.fulfillmentVendorSlug,
      trackingNumber: patch.trackingNumber,
      carrier: patch.carrier,
      status: patch.trackingNumber?.trim() ? "shipped" : undefined,
      updatedAt: timestamp,
    });
  }

  const primary = primaryTrackingFromFulfillments(vendorFulfillments);
  const multi = isMultiVendorOrder(order);
  const terminal =
    order.status === ORDER_STATUS.SHIPPED ||
    order.status === ORDER_STATUS.DELIVERED ||
    order.status === ORDER_STATUS.COMPLETE;

  let nextStatus = patch.status ?? order.status;

  // Mixed carts: only advance to shipped when every vendor has tracking.
  if (multi && patch.fulfillmentVendorSlug && !terminal) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (allVendorsHaveTracking(vendorFulfillments) && allowed.includes(ORDER_STATUS.SHIPPED)) {
      nextStatus = ORDER_STATUS.SHIPPED;
    } else if (anyVendorHasTracking(vendorFulfillments)) {
      if (patch.status === ORDER_STATUS.SHIPPED || patch.status === ORDER_STATUS.DELIVERED) {
        nextStatus = allowed.includes(ORDER_STATUS.PROCESSING)
          ? ORDER_STATUS.PROCESSING
          : order.status;
      } else if (
        (order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.ACCEPTED) &&
        allowed.includes(ORDER_STATUS.PROCESSING)
      ) {
        nextStatus = ORDER_STATUS.PROCESSING;
      }
    }
  }

  const statusChanged = nextStatus !== order.status;

  if (statusChanged) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot change status from ${order.status} to ${nextStatus}`);
    }
  }

  const historyNote =
    patch.note ??
    (multi &&
    patch.fulfillmentVendorSlug === VENDOR_ORANGE_COUNTY &&
    !allVendorsHaveTracking(vendorFulfillments)
      ? "Orange County shipped; SpicyCenter fulfillment still pending"
      : "Updated by Orange County vendor API");

  const historyEntry: OrderStatusHistoryEntry | null = statusChanged
    ? {
        status: nextStatus as OrderStatusHistoryEntry["status"],
        at: timestamp,
        note: historyNote,
      }
    : patch.note
      ? {
          status: order.status,
          at: timestamp,
          note: patch.note,
        }
      : null;

  const updated: StoredOrder = {
    ...order,
    status: nextStatus as Order["status"],
    statusHistory: historyEntry
      ? [...(order.statusHistory ?? []), historyEntry]
      : order.statusHistory,
    vendorFulfillments,
    ...(primary.trackingNumber ? { trackingNumber: primary.trackingNumber } : {}),
    ...(primary.carrier ? { carrier: primary.carrier } : {}),
    ...(patch.vendorShipmentStatus !== undefined
      ? { vendorShipmentStatus: patch.vendorShipmentStatus }
      : {}),
    ...applyDeliveryReviewSchedule(order, nextStatus, timestamp),
    updatedAt: timestamp,
    ...(statusChanged
      ? {
          GSI3PK: orderKeys.gsi3pk(nextStatus),
          GSI3SK: orderKeys.gsi3sk(order.createdAt),
        }
      : {}),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));

  if (statusChanged) {
    try {
      const emailResult = await notifyCustomerOrderStatusChange(updated, {
        previousNotificationStatus: order.status,
      });
      if (!emailResult.ok && !emailResult.skipped) {
        console.error("Vendor status customer email failed:", emailResult.error);
      }
    } catch (err) {
      console.error("Vendor status notification failed:", err);
    }
  }

  return updated;
}

function orderNumberMatches(
  provided: string | undefined,
  pathOrderId: string | undefined,
  order: StoredOrder
): string | null {
  if (!provided) return null;
  const human = displayOrderRef(order);
  const ok =
    provided === pathOrderId ||
    provided === order.orderId ||
    provided === human ||
    provided.toUpperCase() === human.toUpperCase();
  return ok ? null : "orderNumber does not match the order being updated";
}

export async function listOrangeCountyOrders(event: APIGatewayProxyEventV2) {
  if (!vendorApiKeyOk(event)) {
    return unauthorized("Valid X-Vendor-Api-Key required");
  }

  const qs = event.queryStringParameters ?? {};
  const limit = Math.min(
    VENDOR_ORDERS_MAX_LIMIT,
    Math.max(1, Number(qs.limit ?? VENDOR_ORDERS_DEFAULT_LIMIT) || VENDOR_ORDERS_DEFAULT_LIMIT)
  );
  const statusFilter = qs.status?.trim();
  const daysRaw = Number(qs.days ?? VENDOR_ORDERS_DEFAULT_DAYS);
  const days =
    Number.isFinite(daysRaw) && daysRaw > 0
      ? Math.min(90, Math.max(1, Math.floor(daysRaw)))
      : VENDOR_ORDERS_DEFAULT_DAYS;
  // Default: only last 15 days — avoids re-importing the full order history.
  const since = qs.since?.trim() || defaultSinceIso(days);
  const updatedSince = qs.updatedSince?.trim();
  const cursorRaw = qs.cursor?.trim();
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  if (cursorRaw) {
    const decoded = decodeCursor(cursorRaw);
    if (!decoded) return badRequest("Invalid cursor");
    ExclusiveStartKey = decoded;
  }

  const vendorSlug = VENDOR_ORANGE_COUNTY;
  const collected: StoredOrder[] = [];
  let scanned = 0;
  let nextCursorKey: Record<string, unknown> | null = null;
  let hitScanCap = false;

  while (collected.length < limit && scanned < MAX_SCAN_PER_REQUEST) {
    const pageSize = Math.min(100, MAX_SCAN_PER_REQUEST - scanned);
    const result = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
        ScanIndexForward: false,
        Limit: pageSize,
        ExclusiveStartKey,
      })
    );

    const page = (result.Items ?? []) as StoredOrder[];
    scanned += page.length;
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;

    for (const order of page) {
      if (!orderTouchesVendor(order, vendorSlug)) continue;
      if (order.createdAt < since) continue;
      if (updatedSince && (order.updatedAt ?? order.createdAt) < updatedSince) continue;
      // Default: all post-payment stages (paid → processing → shipped → delivered → complete).
      // Matches Admin Portal OC visibility. Exclude unpaid / cancelled / refunded unless ?status=.
      if (statusFilter) {
        if (order.status !== statusFilter) continue;
      } else if (
        order.status === ORDER_STATUS.PENDING_PAYMENT ||
        order.status === ORDER_STATUS.CANCELLED ||
        order.status === ORDER_STATUS.REFUNDED
      ) {
        continue;
      }

      const items = vendorLineItems(order, vendorSlug);
      if (!items.length) continue;

      collected.push({ ...order, items, vendorSlugs: [vendorSlug] });
      if (collected.length >= limit) {
        nextCursorKey = gsi2CursorFromOrder(order) ?? ExclusiveStartKey ?? null;
        break;
      }
    }

    if (collected.length >= limit) break;
    if (!ExclusiveStartKey) break;
    // Older than window — GSI2 is newest-first, so we can stop.
    const oldest = page[page.length - 1];
    if (oldest && oldest.createdAt < since) break;
  }

  if (scanned >= MAX_SCAN_PER_REQUEST && ExclusiveStartKey && !nextCursorKey) {
    hitScanCap = true;
    nextCursorKey = ExclusiveStartKey;
  } else if (!nextCursorKey && ExclusiveStartKey && collected.length >= limit) {
    nextCursorKey = ExclusiveStartKey;
  }

  const hasMore = Boolean(nextCursorKey);
  return ok({
    vendorSlug,
    count: collected.length,
    limit,
    since,
    days,
    updatedSince: updatedSince ?? null,
    hasMore,
    nextCursor: hasMore && nextCursorKey ? encodeCursor(nextCursorKey) : null,
    ...(hitScanCap ? { truncatedScan: true } : {}),
    orders: await Promise.all(collected.map((o) => toVendorOrder(o, o.items))),
  });
}

export async function getOrangeCountyOrder(event: APIGatewayProxyEventV2) {
  if (!vendorApiKeyOk(event)) {
    return unauthorized("Valid X-Vendor-Api-Key required");
  }
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("orderId required");

  const order = await loadVendorOrder(orderId);
  if (!order || !orderTouchesVendor(order, VENDOR_ORANGE_COUNTY)) {
    return forbidden("Order not found for this vendor");
  }

  const items = vendorLineItems(order, VENDOR_ORANGE_COUNTY);
  return ok({
    order: await toVendorOrder(order, items),
  });
}

async function applyShipmentUpdate(
  orderRef: string,
  body: unknown,
  pathOrderId?: string
) {
  const parsed = vendorShipmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  const order = await loadVendorOrder(orderRef);
  if (!order) return notFound("Order not found");
  if (!orderTouchesVendor(order, VENDOR_ORANGE_COUNTY)) {
    return forbidden("Order not found for this vendor");
  }

  const mismatch = orderNumberMatches(parsed.data.orderNumber, pathOrderId, order);
  if (mismatch) return badRequest(mismatch);

  try {
    const multi = isMultiVendorOrder(order);
    const nextStatus =
      order.status === ORDER_STATUS.SHIPPED ||
      order.status === ORDER_STATUS.DELIVERED ||
      order.status === ORDER_STATUS.COMPLETE
        ? order.status
        : multi
          ? ORDER_STATUS.PROCESSING
          : ORDER_STATUS.SHIPPED;

    const updated = await persistVendorOrderUpdate(order, {
      status: nextStatus,
      trackingNumber: parsed.data.awb.trim(),
      carrier: parsed.data.courierName.trim(),
      fulfillmentVendorSlug: VENDOR_ORANGE_COUNTY,
      note: `AWB ${parsed.data.awb.trim()} via ${parsed.data.courierName.trim()} (Orange County)`,
    });

    const ocLane = ensureVendorFulfillments(updated).find(
      (f) => f.vendorSlug === VENDOR_ORANGE_COUNTY
    );

    return ok({
      orderId: displayOrderRef(updated),
      orderNumber: displayOrderRef(updated),
      internalOrderId: updated.orderId,
      status: updated.status,
      awb: ocLane?.trackingNumber ?? updated.trackingNumber,
      courierName: ocLane?.carrier ?? updated.carrier,
      updatedAt: updated.updatedAt,
      multiVendor: multi,
      vendorFulfillments: ensureVendorFulfillments(updated).map((f) => ({
        vendorSlug: f.vendorSlug,
        trackingNumber: f.trackingNumber ?? null,
        status: f.status ?? null,
      })),
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Could not update shipment");
  }
}

async function applyTrackingUpdate(
  orderRef: string,
  body: unknown,
  pathOrderId?: string
) {
  const parsed = vendorTrackingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  const order = await loadVendorOrder(orderRef);
  if (!order) return notFound("Order not found");
  if (!orderTouchesVendor(order, VENDOR_ORANGE_COUNTY)) {
    return forbidden("Order not found for this vendor");
  }

  const mismatch = orderNumberMatches(parsed.data.orderNumber, pathOrderId, order);
  if (mismatch) return badRequest(mismatch);

  const statusRaw = parsed.data.currentShipmentStatus || parsed.data.currentStatus;
  const mapped = mapVendorStatus(statusRaw);
  const note =
    parsed.data.note?.trim() || `Vendor tracking update: ${statusRaw}`;

  try {
    const updated = await persistVendorOrderUpdate(order, {
      ...(mapped && mapped !== order.status ? { status: mapped } : {}),
      fulfillmentVendorSlug: VENDOR_ORANGE_COUNTY,
      vendorShipmentStatus: statusRaw,
      note,
    });

    console.info("vendor.tracking.received", {
      orderNumber: displayOrderRef(updated),
      trackingNumber: updated.trackingNumber ?? null,
      currentShipmentStatus: statusRaw,
      statusMapped: mapped,
      orderStatus: updated.status,
    });

    return ok({
      orderId: displayOrderRef(updated),
      orderNumber: displayOrderRef(updated),
      internalOrderId: updated.orderId,
      status: updated.status,
      trackingNumber: updated.trackingNumber ?? null,
      currentShipmentStatus: statusRaw,
      currentStatusReceived: statusRaw,
      statusMapped: mapped,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Could not update tracking");
  }
}

function parseJsonBody(event: APIGatewayProxyEventV2): { ok: true; body: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, body: JSON.parse(event.body ?? "{}") };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

/** POST AWB + courier when Orange County ships (path includes order id). */
export async function postOrangeCountyShipment(event: APIGatewayProxyEventV2) {
  if (!vendorApiKeyOk(event)) {
    return unauthorized("Valid X-Vendor-Api-Key required");
  }
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("orderId required");

  const parsedBody = parseJsonBody(event);
  if (!parsedBody.ok) return badRequest(parsedBody.error);
  return applyShipmentUpdate(orderId, parsedBody.body, orderId);
}

/** POST tracking status changes from Orange County (path includes order id). */
export async function postOrangeCountyTracking(event: APIGatewayProxyEventV2) {
  if (!vendorApiKeyOk(event)) {
    return unauthorized("Valid X-Vendor-Api-Key required");
  }
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("orderId required");

  const parsedBody = parseJsonBody(event);
  if (!parsedBody.ok) return badRequest(parsedBody.error);
  return applyTrackingUpdate(orderId, parsedBody.body, orderId);
}

/**
 * Body-only AWB update — vendor can call without putting order number in the URL.
 * Body: { orderNumber, courierName, awb }
 */
export async function postOrangeCountyShipmentByBody(event: APIGatewayProxyEventV2) {
  if (!vendorApiKeyOk(event)) {
    return unauthorized("Valid X-Vendor-Api-Key required");
  }
  const parsedBody = parseJsonBody(event);
  if (!parsedBody.ok) return badRequest(parsedBody.error);
  const body = parsedBody.body;
  const orderNumber =
    body && typeof body === "object" && "orderNumber" in body
      ? String((body as { orderNumber?: unknown }).orderNumber ?? "").trim()
      : "";
  if (!orderNumber) return badRequest("orderNumber is required");
  return applyShipmentUpdate(orderNumber, body);
}

/**
 * Body-only tracking update.
 * Body: { orderNumber, currentShipmentStatus } (currentStatus also accepted)
 */
export async function postOrangeCountyTrackingByBody(event: APIGatewayProxyEventV2) {
  if (!vendorApiKeyOk(event)) {
    return unauthorized("Valid X-Vendor-Api-Key required");
  }
  const parsedBody = parseJsonBody(event);
  if (!parsedBody.ok) return badRequest(parsedBody.error);
  const body = parsedBody.body;
  const orderNumber =
    body && typeof body === "object" && "orderNumber" in body
      ? String((body as { orderNumber?: unknown }).orderNumber ?? "").trim()
      : "";
  if (!orderNumber) return badRequest("orderNumber is required");
  return applyTrackingUpdate(orderNumber, body);
}
