import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { pendingPaymentUnsubscribeSchema, pendingPaymentUnsubKeys } from "@spicycorner/shared";
import { docClient, PENDING_PAYMENT_UNSUB_TABLE, now } from "../lib/db";
import { ok, badRequest, created } from "../lib/response";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True when this email opted out of pending-payment reminder emails. */
export async function isPendingPaymentReminderUnsubscribed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return false;

  try {
    const res = await docClient.send(
      new GetCommand({
        TableName: PENDING_PAYMENT_UNSUB_TABLE,
        Key: {
          PK: pendingPaymentUnsubKeys.pk(normalized),
          SK: pendingPaymentUnsubKeys.sk(),
        },
      })
    );
    return Boolean(res.Item);
  } catch (err) {
    console.error("Pending payment unsub lookup failed:", err);
    // Fail open so a table/permission glitch does not block all reminders.
    return false;
  }
}

/** Public: add email to pending-payment reminder unsubscribe list. */
export async function unsubscribePendingPaymentReminders(event: APIGatewayProxyEventV2) {
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = pendingPaymentUnsubscribeSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid email");

  const email = normalizeEmail(parsed.data.email);
  const timestamp = now();

  await docClient.send(
    new PutCommand({
      TableName: PENDING_PAYMENT_UNSUB_TABLE,
      Item: {
        PK: pendingPaymentUnsubKeys.pk(email),
        SK: pendingPaymentUnsubKeys.sk(),
        email,
        unsubscribedAt: timestamp,
        source: "payment_reminder",
        updatedAt: timestamp,
      },
    })
  );

  return created({
    ok: true,
    email,
    message:
      "You have been unsubscribed from pending-payment reminder emails. You will still receive order status updates if you place an order.",
  });
}

/** Optional health/debug — confirm an email is on the list (no PII beyond request). */
export async function checkPendingPaymentUnsubscribe(event: APIGatewayProxyEventV2) {
  const email = normalizeEmail(event.queryStringParameters?.email ?? "");
  if (!email.includes("@")) return badRequest("email query required");
  const unsubscribed = await isPendingPaymentReminderUnsubscribed(email);
  return ok({ email, unsubscribed });
}
