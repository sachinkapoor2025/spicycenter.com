/**
 * Rewrite all product image URLs in DynamoDB from wp-content → CloudFront CDN.
 * Run after syncing uploads to S3: npm run rewrite:product-images
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { resolveProductImageUrls } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;

async function main() {
  const doc = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" })
  );

  let updated = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await doc.send(
      new ScanCommand({ TableName: PRODUCTS_TABLE, ExclusiveStartKey: lastKey })
    );

    for (const item of page.Items ?? []) {
      if (item.SK !== "META" || !String(item.PK).startsWith("PRODUCT#")) continue;
      const images = (item.images as string[]) ?? [];
      if (!images.length) continue;

      const migrated = resolveProductImageUrls(images);
      if (migrated.join("|") === images.join("|")) continue;

      await doc.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: { ...item, images: migrated, updatedAt: new Date().toISOString() },
        })
      );
      updated++;
    }

    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Updated ${updated} products with CDN image URLs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
