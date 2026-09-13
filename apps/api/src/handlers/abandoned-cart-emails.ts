import { QueryCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  ABANDONED_CART_COUPON_HOURS,
  ABANDONED_CART_DISCOUNT_PERCENT,
  ABANDONED_CART_EMAIL_1_MINUTES,
  ABANDONED_CART_EMAIL_2_HOURS,
  cartKeys,
  customerKeys,
  ORDER_STATUS,
  orderKeys,
  type CartItem,
} from "@spicycorner/shared";
import { docClient, CARTS_TABLE, CUSTOMERS_TABLE, ORDERS_TABLE, now } from "../lib/db";
import { issueAbandonedCartCoupon } from "./coupons";
import { sendAbandonedCartEmail } from "../lib/email";

const MS_15_MIN = ABANDONED_CART_EMAIL_1_MINUTES * 60 * 1000;
const MS_4_HOURS = ABANDONED_CART_EMAIL_2_HOURS * 60 * 60 * 1000;

interface StoredCart {
  userKey: string;
  sessionId?: string;
  itemCount?: number;
  value?: number;
  currency?: string;
  updatedAt: string;
  createdAt?: string;
  items?: CartItem[];
  abandonedEmail1SentAt?: string;
  abandonedEmail2SentAt?: string;
  recoveryCouponCode?: string;
  convertedOrderId?: string;
}

async function loadProfile(sessionId: string) {
  const res = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { PK: customerKeys.pk(sessionId), SK: customerKeys.profileSk() },
    })
  );
  return res.Item as { email?: string; name?: string; phone?: string } | undefined;
}

async function hasPaidOrderForSession(sessionId: string, sinceIso: string): Promise<string | undefined> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: ORDERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK >= :since",
      FilterExpression: "#st <> :pending AND #st <> :cancelled",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":pk": orderKeys.gsi1pk(sessionId),
        ":since": sinceIso,
        ":pending": ORDER_STATUS.PENDING_PAYMENT,
        ":cancelled": ORDER_STATUS.CANCELLED,
      },
      ScanIndexForward: false,
      Limit: 5,
    })
  );
  const paid = (res.Items ?? []).find(
    (o) => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.PROCESSING
  );
  return paid?.orderId as string | undefined;
}

async function markEmailSent(
  userKey: string,
  field: "abandonedEmail1SentAt" | "abandonedEmail2SentAt",
  couponCode?: string
) {
  const timestamp = now();
  await docClient.send(
    new UpdateCommand({
      TableName: CARTS_TABLE,
      Key: { PK: cartKeys.pk(userKey), SK: cartKeys.sk() },
      UpdateExpression: couponCode
        ? `SET ${field} = :ts, recoveryCouponCode = :code, updatedAt = :ts`
        : `SET ${field} = :ts, updatedAt = :ts`,
      ExpressionAttributeValues: {
        ":ts": timestamp,
        ...(couponCode ? { ":code": couponCode } : {}),
      },
    })
  );
}

async function processCart(cart: StoredCart): Promise<"sent1" | "sent2" | "skipped"> {
  if ((cart.itemCount ?? 0) <= 0) return "skipped";
  if (cart.convertedOrderId) return "skipped";

  const sessionId = cart.sessionId ?? cart.userKey;
  const profile = await loadProfile(sessionId);
  const email = profile?.email?.trim();
  if (!email?.includes("@")) return "skipped";

  const createdAt = cart.createdAt ?? cart.updatedAt;
  const converted = await hasPaidOrderForSession(sessionId, createdAt);
  if (converted) {
    await docClient.send(
      new UpdateCommand({
        TableName: CARTS_TABLE,
        Key: { PK: cartKeys.pk(cart.userKey), SK: cartKeys.sk() },
        UpdateExpression: "SET convertedOrderId = :oid, updatedAt = :now",
        ExpressionAttributeValues: { ":oid": converted, ":now": now() },
      })
    );
    return "skipped";
  }

  const idleMs = Date.now() - new Date(cart.updatedAt).getTime();
  const name = profile?.name?.split(" ")[0] ?? "there";

  const phone = profile?.phone?.trim();

  if (!cart.abandonedEmail1SentAt && idleMs >= MS_15_MIN) {
    const coupon = await issueAbandonedCartCoupon({ email, sessionId });
    const result = await sendAbandonedCartEmail({
      email,
      name,
      phone,
      items: cart.items ?? [],
      value: cart.value ?? 0,
      currency: cart.currency ?? "USD",
      couponCode: coupon.code,
      expiresAt: coupon.expiresAt,
      reminder: 1,
    });
    if (result.ok) {
      await markEmailSent(cart.userKey, "abandonedEmail1SentAt", coupon.code);
      return "sent1";
    }
    return "skipped";
  }

  if (
    cart.abandonedEmail1SentAt &&
    !cart.abandonedEmail2SentAt &&
    idleMs >= MS_4_HOURS
  ) {
    const coupon = cart.recoveryCouponCode
      ? { code: cart.recoveryCouponCode, expiresAt: "" }
      : await issueAbandonedCartCoupon({ email, sessionId });
    const result = await sendAbandonedCartEmail({
      email,
      name,
      phone,
      items: cart.items ?? [],
      value: cart.value ?? 0,
      currency: cart.currency ?? "USD",
      couponCode: coupon.code,
      expiresAt: coupon.expiresAt,
      reminder: 2,
    });
    if (result.ok) {
      await markEmailSent(cart.userKey, "abandonedEmail2SentAt");
      return "sent2";
    }
  }

  return "skipped";
}

/** Every 15 min: email 1 at 15 min idle; email 2 at 4 h idle with 10% coupon (4 h validity). */
export async function processAbandonedCartEmails(): Promise<{
  scanned: number;
  sent1: number;
  sent2: number;
  skipped: number;
}> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: CARTS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": cartKeys.gsi1pk() },
      ScanIndexForward: false,
      Limit: 300,
    })
  );

  const carts = ((res.Items ?? []) as StoredCart[]).filter((c) => (c.itemCount ?? 0) > 0);

  let sent1 = 0;
  let sent2 = 0;
  let skipped = 0;

  for (const cart of carts) {
    const outcome = await processCart(cart);
    if (outcome === "sent1") sent1 += 1;
    else if (outcome === "sent2") sent2 += 1;
    else skipped += 1;
  }

  console.log("Abandoned cart email cron", { scanned: carts.length, sent1, sent2, skipped });
  return { scanned: carts.length, sent1, sent2, skipped };
}

/** Mark cart converted when order is paid. */
export async function markCartConverted(sessionId: string | undefined, orderId: string) {
  if (!sessionId) return;
  await docClient.send(
    new UpdateCommand({
      TableName: CARTS_TABLE,
      Key: { PK: cartKeys.pk(sessionId), SK: cartKeys.sk() },
      UpdateExpression: "SET convertedOrderId = :oid, updatedAt = :now",
      ExpressionAttributeValues: { ":oid": orderId, ":now": now() },
    })
  ).catch(() => {
    /* cart may already be cleared */
  });
}

export const ABANDONED_CART_COUPON_HOURS_EXPORT = ABANDONED_CART_COUPON_HOURS;
export const ABANDONED_CART_DISCOUNT_EXPORT = ABANDONED_CART_DISCOUNT_PERCENT;
