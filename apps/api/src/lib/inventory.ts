import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  LOW_STOCK_THRESHOLD,
  DEFAULT_USD_INR_RATE,
  convertCurrencyAmount,
  productKeys,
  type Order,
  type Product,
} from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, now, dayBucket } from "./db";
import { notifyLowStock } from "./email";
import { incrementRollup, geoRollupKeys } from "./event-rollups";

function aggregateQuantities(
  items: { productSlug: string; quantity: number; name: string }[]
): Map<string, { qty: number; name: string }> {
  const map = new Map<string, { qty: number; name: string }>();
  for (const item of items) {
    const prev = map.get(item.productSlug);
    map.set(item.productSlug, {
      qty: (prev?.qty ?? 0) + item.quantity,
      name: item.name,
    });
  }
  return map;
}

export async function getProductInventory(slug: string): Promise<number | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!result.Item) return null;
  const inv = (result.Item as Product).inventory;
  return typeof inv === "number" ? inv : 0;
}

/** Returns error message if any line item exceeds available stock. */
export async function validateOrderInventory(
  items: { productSlug: string; quantity: number; name: string }[]
): Promise<string | null> {
  const qtyBySlug = aggregateQuantities(items);

  for (const [slug, { qty, name }] of qtyBySlug) {
    const available = await getProductInventory(slug);
    if (available === null) return `${name} is no longer available.`;
    if (available <= 0) return `${name} is sold out.`;
    if (available < qty) {
      return `Only ${available} left in stock for ${name}. Please reduce quantity.`;
    }
  }
  return null;
}

export async function maybeSendLowStockAlert(product: Product, inventory: number): Promise<void> {
  if (inventory > LOW_STOCK_THRESHOLD) return;
  if (product.lowStockAlertSentAt) return;

  const emailResult = await notifyLowStock(product, inventory);
  if (!emailResult.ok) {
    console.error("Low stock email failed:", product.slug, emailResult.error);
    return;
  }

  const timestamp = now();
  await docClient.send(
    new UpdateCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(product.slug), SK: productKeys.sk() },
      UpdateExpression: "SET lowStockAlertSentAt = :at, updatedAt = :now",
      ExpressionAttributeValues: { ":at": timestamp, ":now": timestamp },
    })
  );
}

/** Decrement stock after payment. Idempotent when called only on first paid transition. */
export async function decrementInventoryForOrder(order: Order): Promise<void> {
  const qtyBySlug = aggregateQuantities(order.items);
  const timestamp = now();

  for (const [slug, { qty, name }] of qtyBySlug) {
    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: PRODUCTS_TABLE,
          Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
          UpdateExpression:
            "SET inventory = inventory - :qty, unitsSold = if_not_exists(unitsSold, :zero) + :qty, updatedAt = :now",
          ConditionExpression: "inventory >= :qty",
          ExpressionAttributeValues: { ":qty": qty, ":now": timestamp, ":zero": 0 },
          ReturnValues: "ALL_NEW",
        })
      );
      const updated = result.Attributes as Product;
      await maybeSendLowStockAlert(updated, updated.inventory);
      const line = order.items.find((i) => i.productSlug === slug);
      const lineRevenue = (line?.price ?? 0) * qty;
      const revenueUsd =
        (line?.currency ?? order.currency) === "INR"
          ? convertCurrencyAmount(lineRevenue, "INR", "USD", DEFAULT_USD_INR_RATE)
          : lineRevenue;
      const addr = order.shippingAddress;
      const day = dayBucket(new Date(order.updatedAt || timestamp));
      const fields = { orders: 1, qty, revenueUsd, homepageOrders: 0 };
      void Promise.all([
        incrementRollup(day, `PRODUCT#${slug}`, "product", slug, fields),
        ...geoRollupKeys(slug, addr.country, addr.state, addr.city).map((geo) =>
          incrementRollup(day, geo.metric, geo.kind, geo.label, fields)
        ),
        incrementRollup(
          day,
          `CATEGORY#${updated.categorySlug ?? "unknown"}`,
          "category",
          updated.categorySlug ?? "unknown",
          fields
        ),
      ]).catch((err) => console.warn("order performance rollup failed", slug, err));
    } catch (err) {
      console.error(`Inventory decrement failed for ${slug} (${name}):`, err);
    }
  }
}

/** Admin restock: clear alert flag when inventory rises above threshold. */
export async function syncInventoryAlertState(
  slug: string,
  previous: Product,
  nextInventory: number
): Promise<void> {
  const timestamp = now();

  if (nextInventory > LOW_STOCK_THRESHOLD && previous.lowStockAlertSentAt) {
    await docClient.send(
      new UpdateCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
        UpdateExpression: "REMOVE lowStockAlertSentAt SET updatedAt = :now",
        ExpressionAttributeValues: { ":now": timestamp },
      })
    );
    return;
  }

  if (
    nextInventory <= LOW_STOCK_THRESHOLD &&
    nextInventory > 0 &&
    nextInventory < (previous.inventory ?? 0) &&
    !previous.lowStockAlertSentAt
  ) {
    await maybeSendLowStockAlert({ ...previous, inventory: nextInventory }, nextInventory);
  }
}
