/**
 * Upsert the 24h flash combo product into DynamoDB.
 *
 *   ENVIRONMENT=prod npx tsx scripts/upsert-flash-combo-product.ts
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { FLASH_COMBO_SALE, productKeys } from "@spicycorner/shared";
import catalog from "./data/spicycenter-catalog.json";

async function main() {
  const ENV = process.env.ENVIRONMENT ?? "prod";
  const TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
  const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

  const bundled = (catalog as { products: Array<Record<string, unknown>> }).products.find(
    (p) => p.slug === FLASH_COMBO_SALE.slug
  );
  if (!bundled) {
    console.error(`Catalog missing ${FLASH_COMBO_SALE.slug}`);
    process.exit(1);
  }

  const slug = String(bundled.slug);
  const key = { PK: productKeys.pk(slug), SK: productKeys.sk() };
  const existing = await doc.send(new GetCommand({ TableName: TABLE, Key: key }));
  const ts = new Date().toISOString();
  const categorySlug = String(bundled.categorySlug ?? "rakhi-combo");

  const item = {
    ...(existing.Item ?? {}),
    ...bundled,
    slug,
    categorySlug,
    currency: bundled.currency ?? "USD",
    couponExcluded: true,
    tags: Array.from(
      new Set([...(Array.isArray(bundled.tags) ? bundled.tags : []), "flash-sale", "fixed-price"])
    ),
    published: true,
    PK: key.PK,
    SK: key.SK,
    GSI1PK: productKeys.gsi1pk(categorySlug),
    GSI1SK: productKeys.gsi1sk(slug),
    createdAt: (existing.Item?.createdAt as string) ?? ts,
    updatedAt: ts,
  };

  await doc.send(new PutCommand({ TableName: TABLE, Item: item }));
  console.log(`${existing.Item ? "Updated" : "Created"} ${slug} in ${TABLE} @ $${item.price}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
