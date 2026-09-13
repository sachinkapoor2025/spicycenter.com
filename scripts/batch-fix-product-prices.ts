/**
 * Patch multiple product prices in DynamoDB.
 *
 *   ENVIRONMENT=prod npx tsx scripts/batch-fix-product-prices.ts \
 *     --price 2.99 --slugs om-single-rakhi,ganesh-single-rakhi
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { productKeys } from "@spicycorner/shared";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const price = Number(arg("price"));
  const compareRaw = arg("compare");
  const compare = compareRaw != null ? Number(compareRaw) : undefined;
  const slugs = (arg("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!slugs.length || !Number.isFinite(price) || price <= 0) {
    console.error(
      "Usage: npx tsx scripts/batch-fix-product-prices.ts --price <n> --slugs a,b,c [--compare <n>]"
    );
    process.exit(1);
  }

  const ENV = process.env.ENVIRONMENT ?? "prod";
  const TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
  const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

  console.log(`Updating ${slugs.length} products in ${TABLE} (${REGION}) → $${price}`);

  for (const slug of slugs) {
    const key = { PK: productKeys.pk(slug), SK: productKeys.sk() };
    const existing = await doc.send(new GetCommand({ TableName: TABLE, Key: key }));
    if (!existing.Item) {
      console.error(`NOT FOUND: ${slug}`);
      continue;
    }

    const names: Record<string, string> = { "#price": "price", "#updatedAt": "updatedAt" };
    const values: Record<string, unknown> = {
      ":price": price,
      ":now": new Date().toISOString(),
    };
    const sets = ["#price = :price", "#updatedAt = :now"];

    if (compare != null && Number.isFinite(compare) && compare > 0) {
      names["#compareAtPrice"] = "compareAtPrice";
      values[":compare"] = compare;
      sets.push("#compareAtPrice = :compare");
    }

    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: key,
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );

    console.log(
      `OK ${slug}: ${existing.Item.price} → ${price}` +
        (existing.Item.compareAtPrice != null
          ? ` (compareAt ${existing.Item.compareAtPrice})`
          : "")
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
