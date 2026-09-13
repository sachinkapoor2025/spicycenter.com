/**
 * Set inventory to 200 for all products (catalog was seeded at 100; target is 200).
 * Does not change unitsSold — that counter is only updated when orders are paid.
 *
 * Run: npm run seed:inventory
 * Requires AWS credentials and PRODUCTS_TABLE / ENVIRONMENT env vars.
 */
import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { productKeys, DEFAULT_PRODUCT_INVENTORY } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;

const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function main() {
  console.log(`Setting inventory on ${TABLE} → ${DEFAULT_PRODUCT_INVENTORY} for all products`);

  const scan = await doc.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
      ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
    })
  );

  const items = scan.Items ?? [];
  let updated = 0;

  for (const item of items) {
    const slug = (item.slug as string) ?? item.PK?.replace("PRODUCT#", "");
    if (!slug) continue;

    if (item.inventory === DEFAULT_PRODUCT_INVENTORY) continue;

    const timestamp = new Date().toISOString();
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
        UpdateExpression: "SET inventory = :inv, updatedAt = :now REMOVE lowStockAlertSentAt",
        ExpressionAttributeValues: {
          ":inv": DEFAULT_PRODUCT_INVENTORY,
          ":now": timestamp,
        },
      })
    );
    updated++;
    console.log(`  ✓ ${slug} → ${DEFAULT_PRODUCT_INVENTORY}`);
  }

  console.log(`Done. Updated ${updated} of ${items.length} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
