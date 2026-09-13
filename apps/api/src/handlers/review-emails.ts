import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  ORDER_STATUS,
  orderKeys,
  isReviewEmailDue,
  resolveReviewEmailDueAt,
  reviewEmailDueAtFrom,
  isDeliveredStatus,
  type Order,
} from "@spicycorner/shared";
import { docClient, ORDERS_TABLE, now } from "../lib/db";
import { sendReviewRequestEmail } from "../lib/email";

type StoredOrder = Order & {
  PK: string;
  SK: string;
  GSI3PK?: string;
  GSI3SK?: string;
};

const DELIVERED_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETE] as const;

async function queryOrdersByStatus(status: string): Promise<StoredOrder[]> {
  const items: StoredOrder[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi3pk(status) },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...((res.Items ?? []) as StoredOrder[]));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function markReviewEmailSent(orderId: string, sentAt: string, dueAt: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
        UpdateExpression:
          "SET reviewEmailSentAt = :sent, reviewEmailDueAt = if_not_exists(reviewEmailDueAt, :due), updatedAt = :now",
        ConditionExpression: "attribute_not_exists(reviewEmailSentAt)",
        ExpressionAttributeValues: {
          ":sent": sentAt,
          ":due": dueAt,
          ":now": sentAt,
        },
      })
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

async function processOrder(order: StoredOrder): Promise<"sent" | "skipped" | "failed"> {
  const dueAt = resolveReviewEmailDueAt(order);
  if (!dueAt || !isReviewEmailDue(order)) return "skipped";

  const customerEmail = order.shippingAddress?.email?.trim();
  if (!customerEmail?.includes("@")) {
    console.warn("Review email skipped — no customer email", order.orderId);
    return "skipped";
  }

  const sentAt = now();
  const claimed = await markReviewEmailSent(order.orderId, sentAt, dueAt);
  if (!claimed) return "skipped";

  const result = await sendReviewRequestEmail(order);
  if (result.ok) return "sent";

  console.error("Review email failed — clearing sent flag", order.orderId, result.error);
  await docClient.send(
    new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(order.orderId), SK: orderKeys.sk() },
      UpdateExpression: "REMOVE reviewEmailSentAt SET updatedAt = :now",
      ExpressionAttributeValues: { ":now": now() },
    })
  );
  return "failed";
}

/** Hourly cron: email customers 1 day after delivery asking for a review. */
export async function processDueReviewEmails(): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const seen = new Set<string>();
  const orders: StoredOrder[] = [];

  for (const status of DELIVERED_STATUSES) {
    for (const order of await queryOrdersByStatus(status)) {
      if (!seen.has(order.orderId)) {
        seen.add(order.orderId);
        orders.push(order);
      }
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const order of orders) {
    const outcome = await processOrder(order);
    if (outcome === "sent") sent += 1;
    else if (outcome === "failed") failed += 1;
    else skipped += 1;
  }

  console.log("Review email cron", { scanned: orders.length, sent, skipped, failed });
  return { scanned: orders.length, sent, skipped, failed };
}

/** Call when admin marks order delivered/complete — sets schedule fields. */
export function applyDeliveryReviewSchedule(
  order: Order,
  nextStatus: string,
  timestamp: string
): Partial<Order> {
  if (nextStatus === order.status || !isDeliveredStatus(nextStatus)) return {};

  const deliveredAt = order.deliveredAt ?? timestamp;
  const patch: Partial<Order> = {};

  if (!order.deliveredAt) patch.deliveredAt = deliveredAt;
  if (!order.reviewEmailSentAt && !order.reviewEmailDueAt) {
    patch.reviewEmailDueAt = reviewEmailDueAtFrom(deliveredAt);
  }
  return patch;
}
