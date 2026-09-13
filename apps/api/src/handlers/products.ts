import { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  createProductSchema,
  updateProductSchema,
  bulkProductRowSchema,
  productKeys,
  DEFAULT_PRODUCT_INVENTORY,
  withCompetitiveStorefrontPricing,
  stripVendorPrivateFields,
  productAllowsAddons,
  resolveProductImagesForUpsert,
  productVisibleToActor,
  defaultVendorSlugForNewProduct,
  isCjDropshippingProduct,
  isStorefrontVisibleProduct,
  isGiftSetProduct,
  GIFT_SETS_CATEGORY_SLUG,
  CJ_STOREFRONT_SHIP_COUNTRIES,
  parseStorefrontListingQuery,
  sortStorefrontListing,
  type Product,
  type CjStorefrontShipCountry,
} from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, now, slugify } from "../lib/db";
import { ok, okCached, created, badRequest, notFound, forbidden } from "../lib/response";
import { getAuth, resolveStaffActor } from "../lib/auth";
import { withResolvedProductImages, resolveProductImageUrl } from "../lib/images";
import { syncInventoryAlertState } from "../lib/inventory";
import { quoteProductShipping, checkoutOnlyShipping } from "../lib/cj-product-shipping";
import { CjApiError } from "../lib/cj-dropshipping";
import { ensureProductInDb } from "../lib/ensure-product";
import { ensureCatalogInDb } from "../lib/spicycorner-catalog";

function forStorefront(product: Product): Product {
  const allowsAddons = productAllowsAddons(product);
  const stripped = stripVendorPrivateFields(
    withCompetitiveStorefrontPricing(withResolvedProductImages(product))
  );
  return { ...stripped, allowsAddons } as Product;
}

/** Listing payloads must stay under API Gateway’s 6MB cap once the catalog is thousands of SKUs. */
export function forStorefrontListing(product: Product): Product {
  const full = forStorefront(product);
  return {
    ...full,
    description: (full.description ?? "").slice(0, 280),
    images: (full.images ?? []).slice(0, 2),
  };
}

/** Table row only — never spread the DynamoDB item (GSI keys, SEO, variants blow past Lambda’s 6MB cap). */
function forAdminList(product: Product): Product {
  const images = (product.images ?? []).slice(0, 2).map((url) => resolveProductImageUrl(url));
  return {
    slug: product.slug,
    name: product.name,
    description: "",
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency ?? "USD",
    categorySlug: product.categorySlug,
    images,
    tags: [],
    sku: product.sku,
    inventory: product.inventory,
    published: product.published,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    vendorSlug: product.vendorSlug,
    vendorCost: product.vendorCost,
    cjPid: product.cjPid,
    unitsSold: product.unitsSold,
    weightOz: product.weightOz,
    lengthIn: product.lengthIn,
    widthIn: product.widthIn,
    heightIn: product.heightIn,
  } as Product;
}

function forAdminPricing(product: Product): Product {
  return {
    slug: product.slug,
    name: product.name,
    description: "",
    price: product.price,
    currency: product.currency ?? "USD",
    categorySlug: product.categorySlug,
    images: [] as string[],
    tags: [] as string[],
    sku: product.sku,
    inventory: product.inventory,
    published: product.published,
    vendorSlug: product.vendorSlug,
    vendorCost: product.vendorCost,
    cjPid: product.cjPid,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  } as Product;
}

const ADMIN_LIST_PROJECTION =
  "slug, #n, price, compareAtPrice, currency, categorySlug, images, sku, inventory, published, createdAt, updatedAt, vendorSlug, vendorCost, cjPid, unitsSold, weightOz, lengthIn, widthIn, heightIn";

const ADMIN_LIST_CACHE_TTL_MS = 60_000;
let adminListCache: { at: number; items: Product[] } | null = null;

async function scanAdminProductRows(): Promise<Product[]> {
  const nowMs = Date.now();
  if (adminListCache && nowMs - adminListCache.at < ADMIN_LIST_CACHE_TTL_MS) {
    return adminListCache.items;
  }

  const items: Product[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ProjectionExpression: ADMIN_LIST_PROJECTION,
        ExpressionAttributeNames: { "#n": "name" },
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        ExclusiveStartKey,
      })
    );
    if (result.Items?.length) items.push(...(result.Items as Product[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  adminListCache = { at: nowMs, items };
  return items;
}

function isKidsComboProduct(product: Product): boolean {
  return false; // spicycorner: no usarakhi kids-rakhi combos

  const text = [product.name, product.description, ...(product.tags ?? [])]
    .join(" ")
    .toLowerCase();

  return [
    "combo",
    "chocolate",
    "chocolates",
    "hershey",
    "lindor",
    "lindt",
    "kitkat",
    "dairy milk",
    "snicker",
    "milky way",
  ].some((term) => text.includes(term));
}

/** Warm-instance caches — cut DynamoDB under concurrent browse; keep prices stable. */
const PRODUCT_LIST_CACHE_TTL_MS = 5 * 60_000; // 5 minutes
const PRODUCT_GET_CACHE_TTL_MS = 5 * 60_000; // 5 minutes
let productListCache: { at: number; items: Product[] } | null = null;
const categoryProductCache = new Map<string, { at: number; items: Product[] }>();
const productGetCache = new Map<string, { at: number; product: Product }>();

async function queryProductsByCategory(categorySlug: string): Promise<Product[]> {
  const nowMs = Date.now();
  const hit = categoryProductCache.get(categorySlug);
  if (hit && nowMs - hit.at < PRODUCT_LIST_CACHE_TTL_MS) return hit.items;

  const items: Product[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: PRODUCTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": productKeys.gsi1pk(categorySlug) },
        ExclusiveStartKey,
      })
    );
    if (result.Items?.length) items.push(...(result.Items as Product[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  categoryProductCache.set(categorySlug, { at: nowMs, items });
  return items;
}

async function scanAllProducts(): Promise<Product[]> {
  const nowMs = Date.now();
  if (productListCache && nowMs - productListCache.at < PRODUCT_LIST_CACHE_TTL_MS) {
    return productListCache.items;
  }

  const items: Product[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        ExclusiveStartKey,
      })
    );
    if (result.Items?.length) items.push(...(result.Items as Product[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  productListCache = { at: nowMs, items };
  return items;
}

export async function listCatalogProducts(): Promise<Product[]> {
  return scanAllProducts();
}

/** Call after product create/update/delete so storefront list stays fresh. */
export function invalidateProductListCache(categorySlug?: string) {
  productListCache = null;
  adminListCache = null;
  productGetCache.clear();
  if (categorySlug) categoryProductCache.delete(categorySlug);
  else categoryProductCache.clear();
}

export async function listProducts(event: APIGatewayProxyEventV2) {
  const category = event.queryStringParameters?.category;
  const search = event.queryStringParameters?.search?.toLowerCase();

  let items: Product[] = [];

  if (category) {
    if (false) {
      const all = await scanAllProducts();
      items = all.filter((product) => true);
    } else if (category === "rakhi-combo") {
      const [combo, kids, hampers] = await Promise.all([
        queryProductsByCategory("rakhi-combo"),
        queryProductsByCategory("kids-rakhi"),
        queryProductsByCategory("rakhi-hampers"),
      ]);
      const bySlug = new Map(combo.map((p) => [p.slug, p]));
      for (const product of kids.filter(isKidsComboProduct)) bySlug.set(product.slug, product);
      for (const product of hampers) {
        if (product.additionalCategorySlugs?.includes("rakhi-combo")) bySlug.set(product.slug, product);
      }
      items = [...bySlug.values()];
    } else if (category === GIFT_SETS_CATEGORY_SLUG) {
      await ensureCatalogInDb();
      items = await queryProductsByCategory(category);
    } else {
      const [primary, hampers] = await Promise.all([
        queryProductsByCategory(category),
        queryProductsByCategory("rakhi-hampers"),
      ]);
      const bySlug = new Map(primary.map((p) => [p.slug, p]));
      for (const product of hampers) {
        if (product.additionalCategorySlugs?.includes(category)) bySlug.set(product.slug, product);
      }
      items = [...bySlug.values()];
    }
  } else {
    items = await scanAllProducts();
  }

  items = items.filter((p) => p.published !== false && (p.inventory ?? 0) > 0);
  items = items.filter(isStorefrontVisibleProduct);
  if (search) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.tags?.some((t) => t.toLowerCase().includes(search))
    );
  }

  const { offset, limit, sort } = parseStorefrontListingQuery(event.queryStringParameters ?? undefined);
  items = sortStorefrontListing(items, sort);
  const total = items.length;
  if (limit != null) items = items.slice(offset, offset + limit);

  const body = {
    products: items.map(forStorefrontListing),
    total,
    offset,
    limit: limit ?? total,
    hasMore: limit != null ? offset + items.length < total : false,
  };

  // Short CDN TTL only — listing + PDP must not drift for minutes after price edits.
  if (search) return ok(body);
  return okCached(body, 10);
}

export async function getProduct(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const nowMs = Date.now();
  const cached = productGetCache.get(slug);
  if (cached && nowMs - cached.at < PRODUCT_GET_CACHE_TTL_MS) {
    return okCached({ product: forStorefront(cached.product) }, 30);
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );

  let item = result.Item as (Product & { published?: boolean }) | undefined;
  if (item && isGiftSetProduct(item)) {
    const refreshed = await ensureProductInDb(slug);
    if (refreshed) item = refreshed as Product & { published?: boolean };
  }
  if (item && !isStorefrontVisibleProduct(item)) {
    item = undefined;
  }
  if (!item) {
    // Storefront may list bundled catalog SKUs before DynamoDB import — upsert on first view.
    const upserted = await ensureProductInDb(slug);
    if (upserted && isStorefrontVisibleProduct(upserted as Product)) {
      item = upserted as Product & { published?: boolean };
      invalidateProductListCache(item.categorySlug);
    }
  }

  if (!item) return notFound("Product not found");
  const product = item;
  if (product.published === false) return notFound("Product not found");
  productGetCache.set(slug, { at: nowMs, product });
  return okCached({ product: forStorefront(product) }, 10);
}

/** Live CJ freight methods + transit time for the product page. */
export async function getProductShipping(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const q = event.queryStringParameters ?? {};
  const dest = (q.country ?? "US").toUpperCase();
  if (!(CJ_STOREFRONT_SHIP_COUNTRIES as readonly string[]).includes(dest)) {
    return badRequest("Unsupported destination country");
  }
  const quantity = Math.min(10, Math.max(1, Number(q.quantity) || 1));
  const vid = q.vid?.trim() || undefined;

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  const product = result.Item as Product | undefined;
  if (!product || product.published === false) return notFound("Product not found");

  try {
    const shipping = await quoteProductShipping({
      product,
      destCountry: dest as CjStorefrontShipCountry,
      vid,
      quantity,
    });
    return okCached({ shipping }, 300);
  } catch (err) {
    if (err instanceof CjApiError) {
      return okCached(
        { shipping: checkoutOnlyShipping(product, dest as CjStorefrontShipCountry, quantity) },
        30
      );
    }
    throw err;
  }
}

/** CJ product videos for the PDP gallery. Hydrates Dynamo if import skipped them. */
export async function getProductVideos(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  const product = result.Item as Product | undefined;
  if (!product || product.published === false) return notFound("Product not found");
  if (product.videos && product.videos.length > 0) {
    return okCached({ videos: product.videos }, 300);
  }
  if (!product.cjPid) return okCached({ videos: [] }, 60);

  try {
    const { collectCjProductVideos, cjProductImageUrls } = await import("../lib/cj-import");
    const { cjGetProduct } = await import("../lib/cj-dropshipping");
    const detail = await cjGetProduct(product.cjPid);
    const videos = await collectCjProductVideos(product.cjPid, detail);
    const images = resolveProductImagesForUpsert(cjProductImageUrls(detail), product.images).images;
    if (videos.length > 0 || images.length !== (product.images?.length ?? 0)) {
      await docClient.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: {
            ...product,
            ...(videos.length > 0 ? { videos } : {}),
            images,
            updatedAt: now(),
          },
        })
      );
      invalidateProductListCache(product.categorySlug);
    }
    return okCached({ videos, images }, 300);
  } catch {
    return okCached({ videos: [], images: product.images ?? [] }, 30);
  }
}

export async function createProduct(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const slug = slugify(parsed.data.name);
  const timestamp = now();
  const inventory = parsed.data.inventory ?? DEFAULT_PRODUCT_INVENTORY;
  const item: Product & { PK: string; SK: string; GSI1PK: string; GSI1SK: string } = {
    ...parsed.data,
    vendorSlug: actor.vendorSlug ?? parsed.data.vendorSlug ?? defaultVendorSlugForNewProduct(actor),
    inventory,
    slug,
    PK: productKeys.pk(slug),
    SK: productKeys.sk(),
    GSI1PK: productKeys.gsi1pk(parsed.data.categorySlug),
    GSI1SK: productKeys.gsi1sk(slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  invalidateProductListCache();
  return created({ product: item });
}

export async function updateProduct(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Product not found");

  const previous = existing.Item as Product;
  if (!productVisibleToActor(previous, actor)) return forbidden();
  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const allowShrinkImages = body?.replaceImages === true;
  const imageUpdate =
    parsed.data.images !== undefined
      ? resolveProductImagesForUpsert(parsed.data.images, previous.images, {
          allowShrink: allowShrinkImages,
        })
      : null;

  const updated = {
    ...previous,
    ...parsed.data,
    ...(actor.vendorSlug ? { vendorSlug: actor.vendorSlug } : {}),
    ...(imageUpdate ? { images: imageUpdate.images } : {}),
    updatedAt: now(),
  } as Product & { PK: string; SK: string; GSI1PK: string; GSI1SK: string };

  if (parsed.data.categorySlug) {
    updated.GSI1PK = productKeys.gsi1pk(parsed.data.categorySlug);
    updated.GSI1SK = productKeys.gsi1sk(slug);
  }

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));
  invalidateProductListCache();

  if (parsed.data.inventory !== undefined) {
    await syncInventoryAlertState(slug, previous, parsed.data.inventory);
  }

  return ok({ product: updated });
}

/** Admin: list products including unpublished. Never return the full catalog in one payload (Lambda 6MB cap). */
export async function listAdminProducts(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const q = event.queryStringParameters ?? {};
  const view = q.view === "pricing" ? "pricing" : "table";
  const search = q.search?.trim().toLowerCase() ?? "";
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));

  const ts = (p: Product) => Date.parse(p.updatedAt ?? p.createdAt ?? "") || 0;
  let items = (await scanAdminProductRows()).filter((p) => productVisibleToActor(p, actor));
  if (search) {
    items = items.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.slug?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search)
    );
  }
  items.sort((a, b) => ts(b) - ts(a));

  if (view === "pricing") {
    return ok({ products: items.map(forAdminPricing), total: items.length });
  }

  const total = items.length;
  const start = (page - 1) * limit;
  return ok({
    products: items.slice(start, start + limit).map(forAdminList),
    total,
    page,
    limit,
  });
}

export async function getAdminProduct(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  const item = result.Item as Product | undefined;
  if (!item) return notFound("Product not found");
  if (!productVisibleToActor(item, actor)) return forbidden();
  return ok({ product: withResolvedProductImages(item) });
}

/** Delete bundled sample catalog SKUs; keep CJ Dropshipping imports. */
export async function purgeSampleCatalogProducts(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor?.isAdmin) return forbidden();

  const deleted: string[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        ExclusiveStartKey,
      })
    );
    for (const raw of result.Items ?? []) {
      const product = raw as Product;
      if (isCjDropshippingProduct(product) || isGiftSetProduct(product)) continue;
      if (!product.slug) continue;
      await docClient.send(
        new DeleteCommand({
          TableName: PRODUCTS_TABLE,
          Key: { PK: productKeys.pk(product.slug), SK: productKeys.sk() },
        })
      );
      deleted.push(product.slug);
    }
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  invalidateProductListCache();
  return ok({ deleted: deleted.length, slugs: deleted });
}

export async function deleteProduct(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Product not found");
  if (!productVisibleToActor(existing.Item as Product, actor)) return forbidden();

  await docClient.send(
    new DeleteCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  invalidateProductListCache();
  return ok({ deleted: true });
}

export async function bulkUploadProducts(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const rows: unknown[] = body.rows ?? body;
  if (!Array.isArray(rows)) return badRequest("Expected array of products");

  const createdProducts: Product[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = bulkProductRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({ row: i + 1, error: parsed.error.message });
      continue;
    }

    const slug = slugify(parsed.data.name);
    const timestamp = now();
    const tags = parsed.data.tags
      ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const existing = await docClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
      })
    );
    // Never wipe galleries on bulk re-upload of an existing product.
    if (existing.Item) {
      errors.push({
        row: i + 1,
        error: `Product already exists (slug=${slug}); bulk upload will not overwrite images/inventory. Edit the product instead.`,
      });
      continue;
    }

    const item = {
      ...parsed.data,
      slug,
      tags,
      images: [],
      PK: productKeys.pk(slug),
      SK: productKeys.sk(),
      GSI1PK: productKeys.gsi1pk(parsed.data.categorySlug),
      GSI1SK: productKeys.gsi1sk(slug),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
    createdProducts.push(item as Product);
  }

  invalidateProductListCache();
  return ok({ created: createdProducts.length, errors, products: createdProducts });
}
