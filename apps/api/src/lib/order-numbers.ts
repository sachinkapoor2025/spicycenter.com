import { UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  orderKeys,
  ORDER_NUMBER_START,
  formatOrderNumber,
  isHumanOrderNumber,
  orderNumberPrefixForItems,
  type Order,
  type OrderNumberPrefix,
  type CartItem,
} from "@spicycorner/shared";
import { docClient, ORDERS_TABLE, now } from "./db";

type StoredOrder = Order & {
  PK: string;
  SK: string;
};

/**
 * Atomically allocate the next human order number for a prefix (OC or HW).
 * Sequence starts at ORDER_NUMBER_START (10001). HW reuses the US counter.
 */
export async function allocateOrderNumber(prefix: OrderNumberPrefix): Promise<string> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.counterPk(prefix), SK: orderKeys.counterSk() },
      UpdateExpression:
        "SET nextVal = if_not_exists(nextVal, :start) + :inc, prefix = :prefix, updatedAt = :u",
      ExpressionAttributeValues: {
        // if_not_exists → 10000, then +1 → 10001 on first allocation
        ":start": ORDER_NUMBER_START - 1,
        ":inc": 1,
        ":prefix": prefix,
        ":u": now(),
      },
      ReturnValues: "UPDATED_NEW",
    })
  );
  const seq = Number(result.Attributes?.nextVal ?? ORDER_NUMBER_START);
  return formatOrderNumber(prefix, seq);
}

export async function allocateOrderNumberForCart(
  items: CartItem[],
  vendorSlugs?: string[]
): Promise<string> {
  const prefix = orderNumberPrefixForItems(items, vendorSlugs);
  return allocateOrderNumber(prefix);
}

/** Persist ORDERNUM#OC10001 → orderId pointer for vendor/admin lookup. */
export async function putOrderNumberPointer(orderNumber: string, orderId: string): Promise<void> {
  const normalized = orderNumber.trim().toUpperCase();
  await docClient.send(
    new PutCommand({
      TableName: ORDERS_TABLE,
      Item: {
        PK: orderKeys.numberPk(normalized),
        SK: orderKeys.numberSk(),
        orderNumber: normalized,
        orderId,
        createdAt: now(),
        updatedAt: now(),
      },
    })
  );
}

async function loadOrderByUuid(orderId: string): Promise<StoredOrder | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
    })
  );
  return result.Item as StoredOrder | undefined;
}

/**
 * Resolve an order by UUID or human order number (OC10001 / HW10001 / legacy US10001).
 */
export async function resolveOrderByIdOrNumber(
  idOrNumber: string
): Promise<StoredOrder | undefined> {
  const raw = idOrNumber.trim();
  if (!raw) return undefined;

  const byId = await loadOrderByUuid(raw);
  if (byId) return byId;

  if (!isHumanOrderNumber(raw)) return undefined;

  const pointer = await docClient.send(
    new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.numberPk(raw), SK: orderKeys.numberSk() },
    })
  );
  const orderId = pointer.Item?.orderId as string | undefined;
  if (!orderId) return undefined;
  return loadOrderByUuid(orderId);
}
