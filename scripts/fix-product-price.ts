/**
 * Patch a single product's price / compare-at / category in DynamoDB.
 *
 *   ENVIRONMENT=prod npx tsx scripts/fix-product-price.ts \
 *     --slug om-single-rakhi --price 9.99 --compare 10.99 --category single-rakhi
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
  const slug = arg("slug");
  const price = Number(arg("price"));
  const compare = Number(arg("compare"));
  const category = arg("category");

  if (!slug || !Number.isFinite(price) || price <= 0) {
    console.error(
      "Usage: npx tsx scripts/fix-product-price.ts --slug <slug> --price <n> [--compare <n>] [--category <slug>]"
    );
    process.exit(1);
  }

  const ENV = process.env.ENVIRONMENT ?? "prod";
  const TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
  const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  const key = { PK: productKeys.pk(slug), SK: productKeys.sk() };

  const existing = await doc.send(new GetCommand({ TableName: TABLE, Key: key }));
  if (!existing.Item) {
    console.error(`Product not found in ${TABLE}: ${slug}`);
    process.exit(1);
  }

  const before = {
    price: existing.Item.price,
    compareAtPrice: existing.Item.compareAtPrice,
    categorySlug: existing.Item.categorySlug,
    currency: existing.Item.currency,
  };

  const names: Record<string, string> = {
    "#price": "price",
    "#updatedAt": "updatedAt",
  };
  const values: Record<string, unknown> = {
    ":price": price,
    ":now": new Date().toISOString(),
  };
  const sets = ["#price = :price", "#updatedAt = :now"];

  if (Number.isFinite(compare) && compare > 0) {
    names["#compareAtPrice"] = "compareAtPrice";
    values[":compare"] = compare;
    sets.push("#compareAtPrice = :compare");
  }

  if (category) {
    names["#categorySlug"] = "categorySlug";
    names["#GSI1PK"] = "GSI1PK";
    names["#GSI1SK"] = "GSI1SK";
    values[":category"] = category;
    values[":gsi1pk"] = productKeys.gsi1pk(category);
    values[":gsi1sk"] = productKeys.gsi1sk(slug);
    sets.push("#categorySlug = :category", "#GSI1PK = :gsi1pk", "#GSI1SK = :gsi1sk");
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

  const after = await doc.send(new GetCommand({ TableName: TABLE, Key: key }));
  console.log(`Updated ${slug} in ${TABLE}`);
  console.log("before:", before);
  console.log("after:", {
    price: after.Item?.price,
    compareAtPrice: after.Item?.compareAtPrice,
    categorySlug: after.Item?.categorySlug,
    currency: after.Item?.currency,
    updatedAt: after.Item?.updatedAt,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
