import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  ORDER_STATUS,
  orderKeys,
  calendarDateKeyNy,
  shouldSendPendingPaymentReminder,
  isPendingPaymentReminderCampaignActive,
  type Order,
} from "@spicycorner/shared";
import { docClient, ORDERS_TABLE, now } from "../lib/db";
import { sendPendingPaymentReminderEmail } from "../lib/email";
import { isPendingPaymentReminderUnsubscribed } from "./pending-payment-unsub";

type StoredOrder = Order & {
  PK: string;
  SK: string;
  GSI3PK?: string;
  GSI3SK?: string;
};

async function queryPendingPaymentOrders(): Promise<StoredOrder[]> {
  const items: StoredOrder[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi3pk(ORDER_STATUS.PENDING_PAYMENT) },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...((res.Items ?? []) as StoredOrder[]));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function claimReminderSlot(orderId: string, sentAt: string, dateKey: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
        UpdateExpression:
          "SET pendingPaymentReminderLastSentAt = :sent, pendingPaymentReminderLastDateKey = :day, pendingPaymentReminderCount = if_not_exists(pendingPaymentReminderCount, :zero) + :one, updatedAt = :sent",
        // Only claim if still unpaid — prevents reminders after payment races.
        ConditionExpression:
          "#status = :pending AND (attribute_not_exists(pendingPaymentReminderLastDateKey) OR pendingPaymentReminderLastDateKey <> :day)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":pending": ORDER_STATUS.PENDING_PAYMENT,
          ":sent": sentAt,
          ":day": dateKey,
          ":zero": 0,
          ":one": 1,
        },
      })
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

async function releaseReminderClaim(orderId: string, previousDateKey?: string): Promise<void> {
  if (previousDateKey) {
    await docClient.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
        UpdateExpression:
          "SET pendingPaymentReminderLastDateKey = :prev, pendingPaymentReminderCount = if_not_exists(pendingPaymentReminderCount, :one) - :one, updatedAt = :now",
        ExpressionAttributeValues: {
          ":prev": previousDateKey,
          ":one": 1,
          ":now": now(),
        },
      })
    ).catch(() => undefined);
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
      UpdateExpression:
        "REMOVE pendingPaymentReminderLastDateKey, pendingPaymentReminderLastSentAt SET pendingPaymentReminderCount = if_not_exists(pendingPaymentReminderCount, :one) - :one, updatedAt = :now",
      ExpressionAttributeValues: { ":one": 1, ":now": now() },
    })
  ).catch(() => undefined);
}

async function processOrder(
  order: StoredOrder
): Promise<"sent" | "skipped" | "failed" | "unsubscribed"> {
  if (!shouldSendPendingPaymentReminder(order)) return "skipped";

  const customerEmail = order.shippingAddress?.email?.trim() ?? "";
  if (customerEmail && (await isPendingPaymentReminderUnsubscribed(customerEmail))) {
    return "unsubscribed";
  }

  const sentAt = now();
  const dateKey = calendarDateKeyNy(new Date(sentAt));
  const previousDateKey = order.pendingPaymentReminderLastDateKey;
  const claimed = await claimReminderSlot(order.orderId, sentAt, dateKey);
  if (!claimed) return "skipped";

  const result = await sendPendingPaymentReminderEmail({
    ...order,
    pendingPaymentReminderCount: order.pendingPaymentReminderCount ?? 0,
  });

  if (result.ok) return "sent";

  console.error("Pending payment reminder failed — releasing claim", order.orderId, result.error);
  await releaseReminderClaim(order.orderId, previousDateKey);
  return "failed";
}

/**
 * Cron (shared 15-min schedule): daily SMTP reminders for pending_payment orders
 * until paid/cancelled, through 28 Aug 2026 (America/New_York).
 */
export async function processPendingPaymentReminders(): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  unsubscribed: number;
  campaignActive: boolean;
}> {
  const campaignActive = isPendingPaymentReminderCampaignActive();
  if (!campaignActive) {
    console.log("Pending payment reminders skipped — campaign ended (after 2026-08-28 NY)");
    return {
      scanned: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      unsubscribed: 0,
      campaignActive: false,
    };
  }

  const orders = await queryPendingPaymentOrders();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let unsubscribed = 0;

  for (const order of orders) {
    const outcome = await processOrder(order);
    if (outcome === "sent") sent += 1;
    else if (outcome === "failed") failed += 1;
    else if (outcome === "unsubscribed") unsubscribed += 1;
    else skipped += 1;
  }

  console.log("Pending payment reminder cron", {
    scanned: orders.length,
    sent,
    skipped,
    failed,
    unsubscribed,
    campaignActive,
  });

  return { scanned: orders.length, sent, skipped, failed, unsubscribed, campaignActive };
}
