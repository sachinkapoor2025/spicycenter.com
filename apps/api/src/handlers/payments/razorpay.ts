import Razorpay from "razorpay";
import crypto from "crypto";
import type { Order } from "@spicycorner/shared";
import { ORDER_STATUS, orderKeys } from "@spicycorner/shared";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ok, badRequest, serverError, unauthorized, notFound, forbidden } from "../../lib/response";
import { getUserOrSessionKey, requireAdmin } from "../../lib/auth";
import { markOrderPaid, getOrderById } from "../orders";
import { isLoadTestMode } from "../../lib/load-test";
import { docClient, ORDERS_TABLE } from "../../lib/db";

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZOR_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZOR_KEY_SECRET;
  return { keyId, keySecret };
}

function getRazorpay(): Razorpay | null {
  const { keyId, keySecret } = getRazorpayCredentials();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpayOrder(order: Order) {
  const { keyId } = getRazorpayCredentials();
  const publishableKeyId = keyId ?? "rzp_dev_key";

  if (isLoadTestMode()) {
    return {
      razorpayOrderId: `order_loadtest_${order.orderId}`,
      keyId: publishableKeyId,
      qrImageUrl: undefined as string | undefined,
      qrId: undefined as string | undefined,
    };
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    return {
      razorpayOrderId: `order_dev_${order.orderId}`,
      keyId: publishableKeyId,
      qrImageUrl: undefined as string | undefined,
      qrId: undefined as string | undefined,
    };
  }

  const rpOrder = await razorpay.orders.create({
    amount: Math.round(order.total * 100),
    currency: order.currency,
    receipt: order.orderId,
    notes: { orderId: order.orderId },
  });

  let qrImageUrl: string | undefined;
  let qrId: string | undefined;

  if (order.currency === "INR") {
    try {
      const qr = await razorpay.qrCode.create({
        type: "upi_qr",
        name: `SpicyCenter ${order.orderId.slice(0, 8)}`,
        usage: "single_use",
        fixed_amount: true,
        payment_amount: Math.round(order.total * 100),
        description: `Order ${order.orderId.slice(0, 8)}`,
        notes: { orderId: order.orderId },
      });
      qrImageUrl = qr.image_url;
      qrId = qr.id;
    } catch (err) {
      console.error("Razorpay QR create failed:", err);
    }
  }

  return {
    razorpayOrderId: rpOrder.id,
    keyId: publishableKeyId,
    qrImageUrl,
    qrId,
  };
}

export async function verifyRazorpayPayment(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const body = JSON.parse(event.body ?? "{}");
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body as {
    orderId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };

  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return badRequest("Missing payment verification fields");
  }

  const order = await getOrderById(orderId);
  if (!order) return badRequest("Order not found");
  if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
    return badRequest("Payment order mismatch");
  }

  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) {
    await markOrderPaid(orderId, { razorpayPaymentId });
    return ok({ verified: true, mode: "dev" });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expected !== razorpaySignature) {
    return badRequest("Invalid payment signature");
  }

  await markOrderPaid(orderId, { razorpayPaymentId });
  return ok({ verified: true });
}

type Notes = Record<string, unknown> | unknown[] | null | undefined;

function notesOrderId(notes: Notes): string | undefined {
  if (!notes || Array.isArray(notes)) return undefined;
  const id = notes.orderId ?? notes.order_id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

async function findPendingOrderByRazorpayOrderId(
  razorpayOrderId: string
): Promise<{ orderId: string } | null> {
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: {
          ":pk": orderKeys.gsi3pk(ORDER_STATUS.PENDING_PAYMENT),
        },
        ExclusiveStartKey: startKey,
        Limit: 100,
      })
    );
    const hit = (page.Items ?? []).find(
      (item) => String(item.razorpayOrderId ?? "") === razorpayOrderId
    );
    if (hit?.orderId) return { orderId: String(hit.orderId) };
    startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (startKey);
  return null;
}

/**
 * Resolve our Dynamo order id from a Razorpay payment/order payload.
 * Payment notes often omit orderId — fall back to Razorpay order receipt/notes.
 */
async function resolveOurOrderId(input: {
  notesOrderId?: string;
  razorpayOrderId?: string;
  receipt?: string;
}): Promise<string | undefined> {
  if (input.notesOrderId) {
    const order = await getOrderById(input.notesOrderId);
    if (order) return order.orderId;
  }
  if (input.receipt) {
    const order = await getOrderById(input.receipt);
    if (order) return order.orderId;
  }
  if (input.razorpayOrderId) {
    const razorpay = getRazorpay();
    if (razorpay) {
      try {
        const rpOrder = (await razorpay.orders.fetch(input.razorpayOrderId)) as {
          receipt?: string;
          notes?: Notes;
        };
        const fromNotes = notesOrderId(rpOrder.notes);
        if (fromNotes) {
          const order = await getOrderById(fromNotes);
          if (order) return order.orderId;
        }
        if (rpOrder.receipt) {
          const order = await getOrderById(rpOrder.receipt);
          if (order) return order.orderId;
        }
      } catch (err) {
        console.error("Razorpay orders.fetch failed", {
          razorpayOrderId: input.razorpayOrderId,
          err,
        });
      }
    }
    const pending = await findPendingOrderByRazorpayOrderId(input.razorpayOrderId);
    if (pending) return pending.orderId;
  }
  return undefined;
}

async function markPaidFromRazorpay(input: {
  ourOrderId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  notesOrderId?: string;
  receipt?: string;
}): Promise<{ ok: boolean; orderId?: string; reason?: string }> {
  const orderId = await resolveOurOrderId({
    notesOrderId: input.notesOrderId ?? input.ourOrderId,
    razorpayOrderId: input.razorpayOrderId,
    receipt: input.receipt,
  });
  if (!orderId) {
    return { ok: false, reason: "order_not_found" };
  }
  await markOrderPaid(orderId, { razorpayPaymentId: input.razorpayPaymentId });
  return { ok: true, orderId };
}

/** True if Razorpay reports this order's payment as captured/paid. */
export async function syncRazorpayCaptureForOrder(orderId: string): Promise<{
  synced: boolean;
  alreadyPaid?: boolean;
  paymentId?: string;
  reason?: string;
}> {
  const order = await getOrderById(orderId);
  if (!order) return { synced: false, reason: "order_not_found" };
  if (order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.PROCESSING) {
    return { synced: false, alreadyPaid: true };
  }
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    return { synced: false, reason: `status_${order.status}` };
  }
  if (order.paymentProvider && order.paymentProvider !== "razorpay") {
    return { synced: false, reason: "not_razorpay" };
  }
  const razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId || razorpayOrderId.includes("_dev_") || razorpayOrderId.includes("_loadtest_")) {
    return { synced: false, reason: "no_razorpay_order" };
  }

  const razorpay = getRazorpay();
  if (!razorpay) return { synced: false, reason: "razorpay_not_configured" };

  try {
    const payments = (await razorpay.orders.fetchPayments(razorpayOrderId)) as {
      items?: Array<{ id?: string; status?: string }>;
    };
    const captured = (payments.items ?? []).find(
      (p) => p.status === "captured" || p.status === "authorized"
    );
    if (!captured?.id) {
      const rpOrder = (await razorpay.orders.fetch(razorpayOrderId)) as { status?: string };
      if (rpOrder.status !== "paid") {
        return { synced: false, reason: "not_captured_at_razorpay" };
      }
    }
    const paymentId = captured?.id;
    await markOrderPaid(orderId, { razorpayPaymentId: paymentId });
    console.log("Razorpay reconcile marked paid", { orderId, paymentId, razorpayOrderId });
    return { synced: true, paymentId };
  } catch (err) {
    console.error("Razorpay sync failed", { orderId, razorpayOrderId, err });
    return {
      synced: false,
      reason: err instanceof Error ? err.message : "sync_failed",
    };
  }
}

/**
 * Cron safety net: pending Razorpay orders where money was captured but
 * client verify / webhook did not update DynamoDB (e.g. tab crash).
 */
export async function reconcilePendingRazorpayPayments(): Promise<{
  checked: number;
  synced: number;
  errors: number;
}> {
  const razorpay = getRazorpay();
  if (!razorpay) return { checked: 0, synced: 0, errors: 0 };

  let checked = 0;
  let synced = 0;
  let errors = 0;
  let startKey: Record<string, unknown> | undefined;
  const minAgeMs = 2 * 60 * 1000; // give client verify a chance first
  const cutoff = Date.now() - minAgeMs;

  do {
    const page = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: {
          ":pk": orderKeys.gsi3pk(ORDER_STATUS.PENDING_PAYMENT),
        },
        ExclusiveStartKey: startKey,
        Limit: 50,
      })
    );

    for (const item of page.Items ?? []) {
      if (String(item.paymentProvider ?? "razorpay") !== "razorpay") continue;
      if (!item.razorpayOrderId) continue;
      const created = Date.parse(String(item.createdAt ?? ""));
      if (Number.isFinite(created) && created > cutoff) continue;

      checked += 1;
      const result = await syncRazorpayCaptureForOrder(String(item.orderId));
      if (result.synced) synced += 1;
      else if (result.reason && !["not_captured_at_razorpay", "no_razorpay_order"].includes(result.reason)) {
        errors += 1;
      }
    }
    startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (startKey);

  if (synced > 0 || checked > 0) {
    console.log("Razorpay reconcile complete", { checked, synced, errors });
  }
  return { checked, synced, errors };
}

export async function syncAdminOrderPayment(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("orderId required");

  const order = await getOrderById(orderId);
  if (!order) return notFound("Order not found");

  const result = await syncRazorpayCaptureForOrder(orderId);
  if (result.alreadyPaid) {
    return ok({ synced: false, alreadyPaid: true, order: await getOrderById(orderId) });
  }
  if (!result.synced) {
    return badRequest(
      result.reason === "not_captured_at_razorpay"
        ? "Razorpay has not captured a payment for this order yet"
        : `Could not sync payment (${result.reason ?? "unknown"})`
    );
  }
  return ok({
    synced: true,
    paymentId: result.paymentId,
    order: await getOrderById(orderId),
  });
}

export async function razorpayWebhook(event: APIGatewayProxyEventV2) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const env = process.env.ENVIRONMENT ?? "dev";

  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET missing — cannot confirm payments after tab crash");
    if (env === "prod" || env === "staging") {
      return serverError("Razorpay webhook secret not configured");
    }
    return ok({ received: true, mode: "dev" });
  }

  const signature =
    event.headers?.["x-razorpay-signature"] ?? event.headers?.["X-Razorpay-Signature"];
  if (!signature) return badRequest("Missing signature");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(event.body ?? "")
    .digest("hex");

  if (expected !== signature) return badRequest("Invalid signature");

  try {
    const payload = JSON.parse(event.body ?? "{}") as {
      event?: string;
      payload?: {
        payment?: { entity?: Record<string, unknown> };
        order?: { entity?: Record<string, unknown> };
        qr_code?: { entity?: Record<string, unknown> };
      };
    };

    const eventName = payload.event ?? "";

    if (eventName === "payment.captured" || eventName === "order.paid") {
      const payment = payload.payload?.payment?.entity;
      const rpOrder = payload.payload?.order?.entity;
      const rpOrderIdRaw = payment?.order_id ?? rpOrder?.id;
      const result = await markPaidFromRazorpay({
        notesOrderId:
          notesOrderId(payment?.notes as Notes) ?? notesOrderId(rpOrder?.notes as Notes),
        razorpayOrderId: rpOrderIdRaw ? String(rpOrderIdRaw) : undefined,
        razorpayPaymentId: payment?.id ? String(payment.id) : undefined,
        receipt: rpOrder?.receipt ? String(rpOrder.receipt) : undefined,
      });
      if (!result.ok) {
        console.error("Razorpay webhook could not resolve order", {
          eventName,
          paymentId: payment?.id,
          razorpayOrderId: payment?.order_id ?? rpOrder?.id,
        });
      }
    }

    if (eventName === "payment.failed") {
      const payment = payload.payload?.payment?.entity;
      const orderId = await resolveOurOrderId({
        notesOrderId: notesOrderId(payment?.notes as Notes),
        razorpayOrderId: payment?.order_id ? String(payment.order_id) : undefined,
      });
      // Do not auto-cancel — customer may retry payment on the same order.
      console.warn("Razorpay payment.failed", {
        orderId,
        paymentId: payment?.id,
        reason: payment?.error_description,
      });
    }

    if (eventName === "qr_code.credited") {
      const qr = payload.payload?.qr_code?.entity;
      const payment = payload.payload?.payment?.entity;
      await markPaidFromRazorpay({
        notesOrderId: notesOrderId(qr?.notes as Notes),
        razorpayPaymentId: payment?.id ? String(payment.id) : undefined,
        razorpayOrderId: payment?.order_id ? String(payment.order_id) : undefined,
      });
    }

    return ok({ received: true });
  } catch (err) {
    console.error("Razorpay webhook error", err);
    return serverError(String(err));
  }
}
