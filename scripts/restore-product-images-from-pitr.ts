/**
 * Merge product images from a PITR-restored table back into production.
 *
 * Usage:
 *   RESTORE_TABLE=spicycorner-products-pitr-recovery ENVIRONMENT=prod npx tsx scripts/restore-product-images-from-pitr.ts
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { mergeProductImages, productKeys } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
const RESTORE_TABLE = process.env.RESTORE_TABLE ?? "spicycorner-products-pitr-recovery";

function getDocClient() {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      ...(endpoint
        ? { endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } }
        : {}),
    })
  );
}

async function waitForTableActive(tableName: string): Promise<void> {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  for (let i = 0; i < 60; i++) {
    const { Table } = await client.send(
      new (await import("@aws-sdk/client-dynamodb")).DescribeTableCommand({ TableName: tableName })
    );
    if (Table?.TableStatus === "ACTIVE") return;
    console.log(`Waiting for ${tableName} to become ACTIVE (${Table?.TableStatus})...`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Table ${tableName} did not become ACTIVE in time`);
}

async function main() {
  await waitForTableActive(RESTORE_TABLE);
  const docClient = getDocClient();
  const timestamp = new Date().toISOString();

  let restored = 0;
  let multiBefore = 0;
  let multiAfter = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: RESTORE_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of page.Items ?? []) {
      const slug = item.slug as string | undefined;
      if (!slug) continue;

      const backupImages = (item.images as string[] | undefined) ?? [];
      if (backupImages.length === 0) continue;

      const current = await docClient.send(
        new GetCommand({
          TableName: PRODUCTS_TABLE,
          Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
        })
      );
      if (!current.Item) continue;

      const currentImages = (current.Item.images as string[] | undefined) ?? [];
      if (currentImages.length > 1) multiBefore++;
      const merged = mergeProductImages(currentImages, backupImages);
      if (merged.length <= currentImages.length) continue;

      await docClient.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: { ...current.Item, images: merged, updatedAt: timestamp },
        })
      );
      restored++;
      if (merged.length > 1) multiAfter++;
      console.log(`  ${slug}: ${currentImages.length} → ${merged.length} images`);
    }

    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  console.log(
    `\nDone. Restored images on ${restored} products (${multiBefore} multi-image before → ${multiAfter} multi-image after merge).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
