import { PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createCategorySchema, updateCategorySchema, categoryKeys, type Category } from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, now, slugify } from "../lib/db";
import { ok, okCached, created, badRequest, notFound, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";
import { ensureCatalogCategoriesInDb } from "../lib/spicycorner-catalog";
import { GIFT_SETS_CATEGORY_SLUG } from "@spicycorner/shared";

const CATEGORY_CACHE_TTL_MS = 60_000;
let categoryCache: { at: number; items: Category[] } | null = null;
/** Once per Lambda instance: repair categories missing GSI1 (legacy WooCommerce/seed imports). */
let categoryIndexRepaired = false;

function invalidateCategoryCache() {
  categoryCache = null;
}

function withCategoryIndex(item: Category & Record<string, unknown>) {
  const sortOrder = typeof item.sortOrder === "number" ? item.sortOrder : 0;
  const slug = String(item.slug ?? "");
  return {
    ...item,
    GSI1PK: categoryKeys.gsi1pk(),
    GSI1SK: categoryKeys.gsi1sk(sortOrder, slug),
  };
}

async function queryAllCategories(): Promise<Category[]> {
  const items: Category[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: PRODUCTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": categoryKeys.gsi1pk() },
        ExclusiveStartKey,
      })
    );
    if (result.Items?.length) items.push(...(result.Items as Category[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

/** Scan all CATEGORY# rows and write missing GSI1 keys so list queries stay complete. */
async function scanAndBackfillCategories(): Promise<Category[]> {
  const items: Array<Category & Record<string, unknown>> = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "CATEGORY#", ":sk": "META" },
        ExclusiveStartKey,
      })
    );
    if (result.Items?.length) {
      items.push(...(result.Items as Array<Category & Record<string, unknown>>));
    }
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  const missingIndex = items.filter((item) => item.GSI1PK !== categoryKeys.gsi1pk());
  if (missingIndex.length > 0) {
    await Promise.all(
      missingIndex.map((item) =>
        docClient.send(
          new PutCommand({
            TableName: PRODUCTS_TABLE,
            Item: withCategoryIndex(item),
          })
        )
      )
    );
  }
  return items.map((item) => withCategoryIndex(item) as Category);
}

async function loadCategories(): Promise<Category[]> {
  const nowMs = Date.now();
  if (categoryCache && nowMs - categoryCache.at < CATEGORY_CACHE_TTL_MS) {
    return categoryCache.items;
  }

  let items = await queryAllCategories();
  // Legacy imports wrote CATEGORY# rows without GSI1. If only indexed rows (e.g. Rakhi
  // Hamper) exist, length > 0 and the old empty-only backfill never ran — repair once.
  if (items.length === 0 || !categoryIndexRepaired) {
    const scanned = await scanAndBackfillCategories();
    await ensureCatalogCategoriesInDb();
    items = await queryAllCategories();
    if (items.length === 0 && scanned.length > 0) {
      items = scanned;
    }
    categoryIndexRepaired = true;
  }

  categoryCache = { at: nowMs, items };
  return items;
}

export async function listCategories(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  let categories = await loadCategories();
  if (!auth?.isAdmin) {
    categories = categories.filter((c) => c.published !== false);
  }
  categories = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  // Admins need fresh data after edits; storefront can use short browser/CDN cache.
  if (auth?.isAdmin) return ok({ categories });
  return okCached({ categories }, 30);
}

export async function createCategory(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const slug = slugify(parsed.data.name);
  const timestamp = now();
  const item = withCategoryIndex({
    ...parsed.data,
    slug,
    PK: categoryKeys.pk(slug),
    SK: categoryKeys.sk(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  invalidateCategoryCache();
  return created({ category: item });
}

export async function deleteCategory(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  await docClient.send(
    new DeleteCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
    })
  );
  invalidateCategoryCache();
  return ok({ deleted: true });
}

export async function getCategory(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
    })
  );

  if (!result.Item) {
    if (slug === GIFT_SETS_CATEGORY_SLUG) {
      await ensureCatalogCategoriesInDb();
      const retry = await docClient.send(
        new GetCommand({
          TableName: PRODUCTS_TABLE,
          Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
        })
      );
      if (retry.Item) return okCached({ category: retry.Item }, 30);
    }
    return notFound("Category not found");
  }
  return okCached({ category: result.Item }, 30);
}

export async function updateCategory(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Category not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = withCategoryIndex({
    ...(existing.Item as Category & Record<string, unknown>),
    ...parsed.data,
    slug,
    PK: categoryKeys.pk(slug),
    SK: categoryKeys.sk(),
    updatedAt: now(),
  } as Category & Record<string, unknown>);

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));
  invalidateCategoryCache();
  return ok({ category: updated as Category });
}
