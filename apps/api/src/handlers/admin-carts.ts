import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { cartKeys, customerKeys, type CartItem } from "@spicycorner/shared";
import { docClient, CARTS_TABLE, CUSTOMERS_TABLE } from "../lib/db";
import { ok, forbidden } from "../lib/response";
import { requireAdmin } from "../lib/auth";

interface AbandonedCart {
  userKey: string;
  sessionId?: string;
  itemCount: number;
  value: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  name?: string;
  email?: string;
  phone?: string;
  abandonedEmail1SentAt?: string;
  abandonedEmail2SentAt?: string;
  recoveryCouponCode?: string;
  convertedOrderId?: string;
  converted: boolean;
}

/**
 * Abandoned carts = carts that still hold items. A successful checkout clears the
 * cart, so a non-empty cart is one the shopper left behind.
 */
export async function getAbandonedCarts(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

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

  const carts = ((res.Items ?? []) as Record<string, unknown>[])
    .filter((c) => Number(c.itemCount ?? 0) > 0)
    .slice(0, 200)
    .map<AbandonedCart>((c) => ({
      userKey: c.userKey as string,
      sessionId: c.sessionId as string | undefined,
      itemCount: Number(c.itemCount ?? 0),
      value: Number(c.value ?? 0),
      currency: c.currency as string | undefined,
      createdAt: (c.createdAt as string) ?? (c.updatedAt as string) ?? "",
      updatedAt: (c.updatedAt as string) ?? "",
      items: (c.items as CartItem[]) ?? [],
      abandonedEmail1SentAt: c.abandonedEmail1SentAt as string | undefined,
      abandonedEmail2SentAt: c.abandonedEmail2SentAt as string | undefined,
      recoveryCouponCode: c.recoveryCouponCode as string | undefined,
      convertedOrderId: c.convertedOrderId as string | undefined,
      converted: Boolean(c.convertedOrderId),
    }));

  await Promise.all(
    carts.map(async (cart) => {
      const sid = cart.sessionId ?? cart.userKey;
      if (!sid) return;
      const profile = await docClient.send(
        new GetCommand({
          TableName: CUSTOMERS_TABLE,
          Key: { PK: customerKeys.pk(sid), SK: customerKeys.profileSk() },
        })
      );
      if (profile.Item) {
        cart.name = profile.Item.name as string | undefined;
        cart.email = profile.Item.email as string | undefined;
        cart.phone = profile.Item.phone as string | undefined;
      }
    })
  );

  return ok({ carts });
}
