import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { productKeys, categoryKeys, configKeys, defaultPaymentConfig } from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, CONFIG_TABLE, now } from "./db";
import { getMemoryStoreSize } from "./memory-store";

const CATALOG_PATH = join(process.cwd(), "scripts/data/spicycenter-catalog.json");

function loadCatalog() {
  if (!existsSync(CATALOG_PATH)) return null;
  return JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as {
    categories: { name: string; slug: string; description: string; sortOrder: number }[];
    products: {
      name: string;
      slug: string;
      description: string;
      price: number;
      compareAtPrice?: number;
      currency: "USD" | "INR";
      categorySlug: string;
      images: string[];
      sku?: string;
      inventory: number;
      tags: string[];
      seoTitle?: string;
      seoDescription?: string;
    }[];
  };
}

export async function seedIfEmpty() {
  if (process.env.USE_MEMORY_DB !== "true") return;
  if (getMemoryStoreSize() > 0) return;

  const catalog = loadCatalog();
  if (!catalog) {
    console.log("No spicycenter-catalog.json found — skipping seed.");
    return;
  }

  const timestamp = now();
  console.log(`Seeding in-memory DB: ${catalog.products.length} SpicyCorner products...`);

  const categories = catalog.categories;

  for (const cat of categories) {
    const sortOrder = typeof cat.sortOrder === "number" ? cat.sortOrder : 0;
    await docClient.send(
      new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: {
          ...cat,
          published: true,
          PK: categoryKeys.pk(cat.slug),
          SK: categoryKeys.sk(),
          GSI1PK: categoryKeys.gsi1pk(),
          GSI1SK: categoryKeys.gsi1sk(sortOrder, cat.slug),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );
  }

  for (const p of catalog.products) {
    await docClient.send(
      new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: {
          ...p,
          published: true,
          PK: productKeys.pk(p.slug),
          SK: productKeys.sk(),
          GSI1PK: productKeys.gsi1pk(p.categorySlug),
          GSI1SK: productKeys.gsi1sk(p.slug),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );
  }

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.payments.pk,
        SK: configKeys.payments.sk,
        ...defaultPaymentConfig,
        updatedAt: timestamp,
      },
    })
  );

  console.log("SpicyCorner demo data ready.");
}
