/**
 * Regenerate product seoDescription fields (complete sentences, ≤155 chars)
 * in catalog JSON and optionally patch DynamoDB.
 *
 * Run:
 *   npm run fix:seo-descriptions              # catalog JSON only
 *   ENVIRONMENT=prod npm run fix:seo-descriptions -- --db   # catalog + DynamoDB
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { metaDescription, productKeys } from "@spicycorner/shared";

const CATALOG_PATH = join(process.cwd(), "scripts/data/spicycenter-catalog.json");

interface CatalogProduct {
  slug: string;
  name: string;
  description: string;
  seoDescription?: string;
}

interface Catalog {
  categories: unknown[];
  products: CatalogProduct[];
}

function fixCatalog(catalog: Catalog): number {
  let changed = 0;
  for (const p of catalog.products) {
    const next = metaDescription(p.description);
    if (p.seoDescription !== next) {
      p.seoDescription = next;
      changed++;
    }
  }
  return changed;
}

async function patchDb(products: CatalogProduct[]): Promise<number> {
  const ENV = process.env.ENVIRONMENT ?? "prod";
  const TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
  const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  const timestamp = new Date().toISOString();
  let updated = 0;

  for (const p of products) {
    const seoDescription = p.seoDescription ?? metaDescription(p.description);
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: productKeys.pk(p.slug), SK: productKeys.sk() },
        UpdateExpression: "SET seoDescription = :seo, updatedAt = :now",
        ExpressionAttributeValues: {
          ":seo": seoDescription,
          ":now": timestamp,
        },
      })
    );
    updated++;
    if (updated % 25 === 0) console.log(`  DB: ${updated}/${products.length}…`);
  }

  return updated;
}

async function main() {
  const patchDbFlag = process.argv.includes("--db");

  if (!existsSync(CATALOG_PATH)) {
    console.error(`Catalog not found: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as Catalog;
  const changed = fixCatalog(catalog);
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Catalog: updated ${changed} of ${catalog.products.length} seoDescription fields`);

  if (patchDbFlag) {
    console.log("Patching DynamoDB…");
    const updated = await patchDb(catalog.products);
    console.log(`DB: updated ${updated} products`);
  } else {
    console.log("Tip: run with --db to push seoDescription to DynamoDB");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
