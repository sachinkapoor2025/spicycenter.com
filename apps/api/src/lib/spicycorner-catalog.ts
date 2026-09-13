import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { productKeys, categoryKeys, DEFAULT_PRODUCT_INVENTORY } from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, now } from "./db";

type CatalogCategory = {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
};

type CatalogProduct = {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: "USD" | "INR";
  categorySlug: string;
  additionalCategorySlugs?: string[];
  images: string[];
  sku?: string;
  inventory?: number;
  tags?: string[];
  published?: boolean;
  vendorSlug?: string;
};

function loadCatalog(): { categories: CatalogCategory[]; products: CatalogProduct[] } {
  const candidates = [
    join(process.cwd(), "scripts/data/spicycenter-catalog.json"),
    join(process.cwd(), "../../scripts/data/spicycenter-catalog.json"),
    join(process.cwd(), "../scripts/data/spicycenter-catalog.json"),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) return { categories: [], products: [] };
  return JSON.parse(readFileSync(path, "utf-8"));
}

const catalog = loadCatalog();
const categories = catalog.categories ?? [];
const products = catalog.products ?? [];
const bySlug = new Map(products.map((p) => [p.slug, p]));

export function getBundledCatalogProduct(slug: string): CatalogProduct | undefined {
  return bySlug.get(slug);
}

export async function ensureCatalogCategoriesInDb(): Promise<number> {
  if (categories.length === 0) return 0;
  const ts = now();
  let created = 0;
  await Promise.all(
    categories.map(async (cat) => {
      const existing = await docClient.send(
        new GetCommand({ TableName: PRODUCTS_TABLE, Key: { PK: categoryKeys.pk(cat.slug), SK: categoryKeys.sk() } })
      );
      if (existing.Item) return;
      await docClient.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: {
            PK: categoryKeys.pk(cat.slug),
            SK: categoryKeys.sk(),
            GSI1PK: categoryKeys.gsi1pk(),
            GSI1SK: categoryKeys.gsi1sk(cat.sortOrder ?? 0, cat.slug),
            name: cat.name,
            slug: cat.slug,
            description: cat.description ?? "",
            sortOrder: cat.sortOrder ?? 0,
            published: true,
            createdAt: ts,
            updatedAt: ts,
          },
        })
      );
      created += 1;
    })
  );
  return created;
}

export async function ensureCatalogProductInDb(slug: string): Promise<Record<string, unknown> | null> {
  const bundled = bySlug.get(slug);
  if (!bundled) return null;
  const existing = await docClient.send(
    new GetCommand({ TableName: PRODUCTS_TABLE, Key: { PK: productKeys.pk(slug), SK: productKeys.sk() } })
  );
  if (existing.Item) return existing.Item as Record<string, unknown>;
  const ts = now();
  const item = {
    PK: productKeys.pk(slug),
    SK: productKeys.sk(),
    GSI1PK: productKeys.gsi1pk(bundled.categorySlug),
    GSI1SK: productKeys.gsi1sk(slug),
    ...bundled,
    inventory: bundled.inventory ?? DEFAULT_PRODUCT_INVENTORY,
    vendorSlug: bundled.vendorSlug ?? "spicycorner",
    published: bundled.published !== false,
    createdAt: ts,
    updatedAt: ts,
  };
  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  return item;
}

export async function ensureCatalogInDb(): Promise<void> {
  await ensureCatalogCategoriesInDb();
}
