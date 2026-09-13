/**
 * One-time migration: copy ORDERS and LEADS/SESSIONS from the legacy single
 * table (spicycorner-<env>) into the new per-domain tables.
 *
 * Products/categories are re-seeded via `npm run import:spicycorner`, and carts are
 * ephemeral, so they are intentionally NOT migrated here.
 *
 * Usage (against AWS):
 *   ENVIRONMENT=prod LEGACY_TABLE=spicycorner-prod npx tsx scripts/migrate-to-multitable.ts
 *
 * Safe to re-run (idempotent puts). The legacy table is only read, never deleted.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { orderKeys, customerKeys, ORDER_STATUS } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "dev";
const LEGACY_TABLE = process.env.LEGACY_TABLE ?? `spicycorner-${ENV}`;
const ORDERS_TABLE = process.env.ORDERS_TABLE ?? `spicycorner-orders-${ENV}`;
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE ?? `spicycorner-customers-${ENV}`;
const DRY_RUN = process.argv.includes("--dry-run");

const endpoint = process.env.DYNAMODB_ENDPOINT;
const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(endpoint
    ? { endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } }
    : {}),
});
const doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

async function scanAll(): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new ScanCommand({ TableName: LEGACY_TABLE, ExclusiveStartKey })
    );
    items.push(...((res.Items ?? []) as Record<string, unknown>[]));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

function isOrder(item: Record<string, unknown>): boolean {
  return typeof item.SK === "string" && (item.SK as string).startsWith("ORDER#") && !!item.orderId;
}

function isLead(item: Record<string, unknown>): boolean {
  return typeof item.PK === "string" && (item.PK as string).startsWith("LEAD#");
}

function isSession(item: Record<string, unknown>): boolean {
  return (
    typeof item.PK === "string" &&
    (item.PK as string).startsWith("SESSION#") &&
    item.SK === "META"
  );
}

async function migrateOrder(item: Record<string, unknown>) {
  const orderId = item.orderId as string;
  const createdAt = (item.createdAt as string) ?? new Date().toISOString();
  const status = (item.status as string) ?? ORDER_STATUS.PENDING_PAYMENT;
  // derive the legacy owner key from PK "USER#<key>"
  const userKey = String(item.PK ?? "").replace(/^USER#/, "") || (item.userId as string) || orderId;

  const newItem = {
    ...item,
    statusHistory: item.statusHistory ?? [{ status, at: createdAt }],
    PK: orderKeys.pk(orderId),
    SK: orderKeys.sk(),
    GSI1PK: orderKeys.gsi1pk(userKey),
    GSI1SK: orderKeys.gsi1sk(createdAt),
    GSI2PK: orderKeys.gsi2pk(),
    GSI2SK: orderKeys.gsi2sk(createdAt),
    GSI3PK: orderKeys.gsi3pk(status),
    GSI3SK: orderKeys.gsi3sk(createdAt),
  };

  if (DRY_RUN) return;
  await doc.send(new PutCommand({ TableName: ORDERS_TABLE, Item: newItem }));
}

async function migrateLead(item: Record<string, unknown>) {
  const sessionId = (item.sessionId as string) ?? "unknown";
  const createdAt = (item.createdAt as string) ?? new Date().toISOString();
  const newItem = {
    ...item,
    PK: customerKeys.pk(sessionId),
    SK: customerKeys.leadSk(createdAt),
    GSI1PK: customerKeys.gsi1pk(),
    GSI1SK: customerKeys.gsi1sk(createdAt),
  };
  if (DRY_RUN) return;
  await doc.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: newItem }));
}

async function migrateSession(item: Record<string, unknown>) {
  const sessionId =
    (item.sessionId as string) ?? String(item.PK ?? "").replace(/^SESSION#/, "");
  const newItem = {
    ...item,
    PK: customerKeys.pk(sessionId),
    SK: customerKeys.profileSk(),
  };
  if (DRY_RUN) return;
  await doc.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: newItem }));
}

async function main() {
  console.log(`Reading legacy table: ${LEGACY_TABLE}${DRY_RUN ? " (dry run)" : ""}`);
  const items = await scanAll();

  let orders = 0;
  let leads = 0;
  let sessions = 0;

  for (const item of items) {
    if (isOrder(item)) {
      await migrateOrder(item);
      orders++;
    } else if (isLead(item)) {
      await migrateLead(item);
      leads++;
    } else if (isSession(item)) {
      await migrateSession(item);
      sessions++;
    }
  }

  console.log(`Migrated → orders: ${orders}, leads: ${leads}, sessions: ${sessions}`);
  console.log(`Targets: orders=${ORDERS_TABLE}, customers=${CUSTOMERS_TABLE}`);
  console.log("Legacy table left intact. Products/categories: run `npm run import:spicycorner`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
