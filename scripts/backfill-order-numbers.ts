/**
 * Backfill human-readable order numbers (OC10001… / HW10001…) on existing orders
 * and create ORDERNUM# lookup pointers. Legacy US10001… numbers are kept.
 *
 *   ENVIRONMENT=prod npx tsx scripts/backfill-order-numbers.ts
 *   DRY_RUN=1 npx tsx scripts/backfill-order-numbers.ts
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  orderKeys,
  ORDER_NUMBER_START,
  formatOrderNumber,
  orderNumberPrefixForItems,
  type Order,
} from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const ORDERS_TABLE = process.env.ORDERS_TABLE ?? `spicycorner-orders-${ENV}`;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const REGION = process.env.AWS_DEFAULT_REGION || "us-east-1";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

type StoredOrder = Order & { PK: string; SK: string };

async function setCounter(prefix: "OC" | "US" | "HW", nextVal: number) {
  if (DRY_RUN) {
    console.log(`[dry-run] counter ${prefix} → ${nextVal}`);
    return;
  }
  await ddb.send(
    new PutCommand({
      TableName: ORDERS_TABLE,
      Item: {
        PK: orderKeys.counterPk(prefix),
        SK: orderKeys.counterSk(),
        nextVal,
        prefix,
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

async function main() {
  const orders: StoredOrder[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: ORDERS_TABLE,
        ExclusiveStartKey,
        FilterExpression: "begins_with(PK, :p) AND SK = :sk",
        ExpressionAttributeValues: { ":p": "ORDER#", ":sk": "META" },
      })
    );
    for (const item of page.Items ?? []) {
      // Skip counters / pointers
      if (String(item.PK).startsWith("ORDERNUM#") || String(item.PK).startsWith("COUNTER#")) continue;
      if (!item.orderId) continue;
      orders.push(item as StoredOrder);
    }
    ExclusiveStartKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  // Oldest first so numbers follow chronology
  orders.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  let ocSeq = ORDER_NUMBER_START - 1;
  let usSeq = ORDER_NUMBER_START - 1;
  let assigned = 0;
  let skipped = 0;

  for (const order of orders) {
    if (order.orderNumber && /^(OC|US|HW)\d+/i.test(order.orderNumber)) {
      const m = order.orderNumber.match(/^(OC|US|HW)(\d+)$/i);
      if (m) {
        const seq = Number(m[2]);
        if (m[1]!.toUpperCase() === "OC") ocSeq = Math.max(ocSeq, seq);
        else usSeq = Math.max(usSeq, seq);
      }
      skipped += 1;
      // Ensure pointer exists
      if (!DRY_RUN) {
        await ddb.send(
          new PutCommand({
            TableName: ORDERS_TABLE,
            Item: {
              PK: orderKeys.numberPk(order.orderNumber),
              SK: orderKeys.numberSk(),
              orderNumber: order.orderNumber.toUpperCase(),
              orderId: order.orderId,
              updatedAt: new Date().toISOString(),
            },
          })
        );
      }
      continue;
    }

    const prefix = orderNumberPrefixForItems(order.items ?? [], order.vendorSlugs);
    if (prefix === "OC") ocSeq += 1;
    else usSeq += 1;
    const seq = prefix === "OC" ? ocSeq : usSeq;
    const orderNumber = formatOrderNumber(prefix, seq);

    console.log(
      `${order.orderId.slice(0, 8)}… → ${orderNumber} (${prefix === "OC" ? "Orange County" : "SpicyCorner"}) ${order.createdAt}`
    );

    if (!DRY_RUN) {
      await ddb.send(
        new UpdateCommand({
          TableName: ORDERS_TABLE,
          Key: { PK: order.PK, SK: order.SK },
          UpdateExpression: "SET orderNumber = :n, updatedAt = :u",
          ExpressionAttributeValues: {
            ":n": orderNumber,
            ":u": new Date().toISOString(),
          },
        })
      );
      await ddb.send(
        new PutCommand({
          TableName: ORDERS_TABLE,
          Item: {
            PK: orderKeys.numberPk(orderNumber),
            SK: orderKeys.numberSk(),
            orderNumber,
            orderId: order.orderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      );
    }
    assigned += 1;
  }

  await setCounter("OC", ocSeq);
  await setCounter("US", usSeq);

  console.log(
    `\nDone. assigned=${assigned} alreadyHadNumber=${skipped} OC_next=${ocSeq} US_next=${usSeq} DRY_RUN=${DRY_RUN}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
