import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  DEFAULT_PRODUCT_INVENTORY,
  VENDOR_CJ_DROPSHIPPING,
  cjPidKeys,
  gramsToOz,
  mapCjCategoryToStoreSlug,
  mmToInches,
  pricingFromVendorCost,
  productKeys,
  resolveProductImagesForUpsert,
  stripHtml,
  type Product,
} from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, now, slugify } from "./db";
import {
  cjAddToMyProduct,
  cjGetProduct,
  cjQueryVideosByProductId,
  type CjListProduct,
  type CjProductDetail,
  type CjVariantRaw,
} from "./cj-dropshipping";
import { copyCjVideoToCdn, type StoredProductVideo } from "./cj-media";

function num(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function inventoryFromVariant(variant: CjVariantRaw | undefined): number {
  const stocks = variant?.inventories ?? [];
  const total = stocks.reduce((sum, row) => sum + (Number(row.totalInventory) || 0), 0);
  if (total > 0) return total;
  return DEFAULT_PRODUCT_INVENTORY;
}

function mapVariants(detail: CjProductDetail) {
  return (detail.variants ?? [])
    .filter((v): v is CjVariantRaw & { vid: string } => Boolean(v.vid))
    .slice(0, 40)
    .map((v) => {
      const cost = num(v.variantSellPrice);
      const priced = cost ? pricingFromVendorCost(cost, "USD") : undefined;
      return {
        vid: v.vid,
        sku: v.variantSku,
        key: v.variantKey,
        name: v.variantNameEn || v.variantKey,
        image: v.variantImage,
        inventory: inventoryFromVariant(v),
        ...(priced
          ? { price: priced.price, vendorCost: priced.vendorCost }
          : {}),
        ...(gramsToOz(Number(v.variantWeight)) ? { weightOz: gramsToOz(Number(v.variantWeight)) } : {}),
        ...(mmToInches(Number(v.variantLength)) ? { lengthIn: mmToInches(Number(v.variantLength)) } : {}),
        ...(mmToInches(Number(v.variantWidth)) ? { widthIn: mmToInches(Number(v.variantWidth)) } : {}),
        ...(mmToInches(Number(v.variantHeight)) ? { heightIn: mmToInches(Number(v.variantHeight)) } : {}),
      };
    });
}

function pickDefaultVariant(variants: ReturnType<typeof mapVariants>) {
  return (
    variants.find((v) => (v.inventory ?? 0) > 0) ??
    variants[0]
  );
}

function productSlug(name: string, pid: string): string {
  const base = slugify(name) || "cj-product";
  const suffix = pid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  return suffix ? `${base}-${suffix}` : base;
}

function listVendorCost(row: CjListProduct): number | undefined {
  const fromFields = [
    row.nowPrice,
    row.discountPrice,
    row.sellPrice,
    row.productSellPrice,
    row.suggestSellPrice,
    row.price,
  ];
  for (const value of fromFields) {
    const n = num(value);
    if (n) return n;
  }
  const variantCosts = (row.variants ?? [])
    .map((variant) => num(variant.variantSellPrice))
    .filter((n): n is number => n != null);
  return variantCosts.length ? Math.min(...variantCosts) : undefined;
}

function uniqueHttpUrls(urls: Array<string | undefined>, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const key = url.split("?")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

export function cjProductImageUrls(detail: CjProductDetail, extra: Array<string | undefined> = []): string[] {
  return uniqueHttpUrls([detail.bigImage, ...(detail.productImageSet ?? []), ...extra], 40);
}

function videosFromDescription(html: string | undefined): string[] {
  if (!html) return [];
  return uniqueHttpUrls([...(html.match(/https?:\/\/[^"'>\s]+\.mp4/gi) ?? [])], 4);
}

export async function collectCjProductVideos(
  pid: string,
  detail?: CjProductDetail
): Promise<StoredProductVideo[]> {
  let rows: Awaited<ReturnType<typeof cjQueryVideosByProductId>> = [];
  try {
    rows = await cjQueryVideosByProductId(pid);
  } catch (err) {
    console.warn("CJ queryVideosByProductId failed", pid, err);
  }

  const fromApi = rows
    .filter((row) => row.videoState !== "OFF_STATE" && row.videoUrl)
    .slice(0, 3);

  const stored: StoredProductVideo[] = [];
  for (const row of fromApi) {
    const copied = await copyCjVideoToCdn({
      pid,
      videoId: row.videoId || row.id,
      videoUrl: row.videoUrl as string,
      posterUrl: row.coverURL,
      durationSec: typeof row.duration === "number" ? row.duration : undefined,
    });
    if (copied) stored.push(copied);
  }

  const have = new Set(stored.map((v) => v.url.split("?")[0].toLowerCase()));
  for (const url of uniqueHttpUrls(
    [...(detail?.productVideo ?? []), ...videosFromDescription(detail?.description)],
    3
  )) {
    const key = url.split("?")[0].toLowerCase();
    if (have.has(key) || stored.length >= 3) continue;
    const copied = await copyCjVideoToCdn({ pid, videoUrl: url });
    if (copied) {
      stored.push(copied);
      have.add(copied.url.split("?")[0].toLowerCase());
    }
  }
  return stored;
}

export function catalogPreviewFromList(row: CjListProduct) {
  const cost = listVendorCost(row);
  const priced = cost ? pricingFromVendorCost(cost, "USD") : undefined;
  return {
    pid: row.id,
    name: row.nameEn,
    sku: row.sku || row.spu,
    image: row.bigImage,
    vendorCost: priced?.vendorCost,
    price: priced?.price,
    compareAtPrice: priced?.compareAtPrice,
    inventory: Number(row.warehouseInventoryNum) || undefined,
    categorySlug: mapCjCategoryToStoreSlug({
      oneCategoryName: row.oneCategoryName,
      twoCategoryName: row.twoCategoryName,
      threeCategoryName: row.threeCategoryName,
      productName: row.nameEn,
    }),
    categoryName: row.threeCategoryName || row.twoCategoryName,
    description: row.description ? stripHtml(row.description).slice(0, 400) : undefined,
  };
}

export async function listImportedCjPids(): Promise<Set<string>> {
  const pids = new Set<string>();
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND attribute_exists(cjPid)",
        ProjectionExpression: "cjPid",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        ExclusiveStartKey,
      })
    );
    for (const item of result.Items ?? []) {
      if (typeof item.cjPid === "string" && item.cjPid) pids.add(item.cjPid);
    }
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return pids;
}

export async function rememberImportedCjPid(pid: string, slug: string, name?: string): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: PRODUCTS_TABLE,
      Item: {
        PK: cjPidKeys.pk(pid),
        SK: cjPidKeys.sk(),
        cjPid: pid,
        slug,
        ...(name ? { name } : {}),
        updatedAt: now(),
      },
    })
  );
}

export async function importCjProduct(
  pid: string,
  options: {
    categorySlug?: string;
    published?: boolean;
    addToMyProduct?: boolean;
    skipVideos?: boolean;
  } = {}
): Promise<{ product: Product; created: boolean }> {
  const detail = await cjGetProduct(pid);
  const name = (detail.productNameEn || "").trim() || `CJ product ${pid.slice(0, 8)}`;
  const slug = productSlug(name, detail.pid || pid);
  const variants = mapVariants(detail);
  const chosen = pickDefaultVariant(variants);
  const cost =
    chosen?.vendorCost ??
    num(detail.sellPrice) ??
    num(detail.variants?.[0]?.variantSellPrice);
  if (!cost) {
    throw new Error(`CJ product ${pid} has no sell price`);
  }
  const priced = pricingFromVendorCost(cost, "USD");
  const images = cjProductImageUrls(
    detail,
    variants.map((v) => v.image)
  );

  const categorySlug =
    options.categorySlug ||
    mapCjCategoryToStoreSlug({
      categoryName: detail.categoryName,
      productName: name,
    });

  const weightOz =
    chosen?.weightOz ?? gramsToOz(Number(detail.packingWeight) || Number(detail.productWeight));
  const inventory =
    chosen?.inventory && chosen.inventory > 0
      ? chosen.inventory
      : DEFAULT_PRODUCT_INVENTORY;

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  const previous = existing.Item as Product | undefined;
  const imageUpdate = resolveProductImagesForUpsert(images, previous?.images);
  const timestamp = now();
  const description = (stripHtml(detail.description || "") || name).slice(0, 8000);

  const item: Product & { PK: string; SK: string; GSI1PK: string; GSI1SK: string } = {
    ...(previous ?? {}),
    slug,
    name,
    description,
    price: priced.price,
    compareAtPrice: priced.compareAtPrice,
    currency: "USD",
    categorySlug,
    images: imageUpdate.images,
    ...(previous?.videos?.length ? { videos: previous.videos } : {}),
    sku: chosen?.sku || detail.productSku,
    inventory,
    tags: Array.from(new Set([...(previous?.tags ?? []), "cj-dropshipping", "spice"])),
    vendorSlug: VENDOR_CJ_DROPSHIPPING,
    vendorCost: priced.vendorCost,
    cjPid: detail.pid || pid,
    ...(chosen?.vid ? { cjVid: chosen.vid } : {}),
    ...(variants.length ? { cjVariants: variants } : {}),
    published: options.published ?? previous?.published ?? true,
    ...(weightOz ? { weightOz } : {}),
    ...(chosen?.lengthIn ? { lengthIn: chosen.lengthIn } : {}),
    ...(chosen?.widthIn ? { widthIn: chosen.widthIn } : {}),
    ...(chosen?.heightIn ? { heightIn: chosen.heightIn } : {}),
    seoTitle: `${name} | SpicyCorner`,
    seoDescription: description.slice(0, 160),
    PK: productKeys.pk(slug),
    SK: productKeys.sk(),
    GSI1PK: productKeys.gsi1pk(categorySlug),
    GSI1SK: productKeys.gsi1sk(slug),
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  await rememberImportedCjPid(detail.pid || pid, slug, name);
  const { invalidateProductListCache } = await import("../handlers/products");
  invalidateProductListCache(categorySlug);

  if (!options.skipVideos) {
    try {
      const fetchedVideos = await collectCjProductVideos(detail.pid || pid, detail);
      if (fetchedVideos.length > 0) {
        item.videos = fetchedVideos;
        await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
      }
    } catch (err) {
      console.warn("CJ video import failed", pid, err);
    }
  }

  if (options.addToMyProduct === true) {
    try {
      await cjAddToMyProduct(detail.pid || pid);
    } catch (err) {
      console.warn("CJ addToMyProduct failed", pid, err);
    }
  }

  return { product: item, created: !previous };
}

export type CjImportedSummary = {
  slug: string;
  name: string;
  pid?: string;
  price: number;
  vendorCost?: number;
};

export async function importCjProducts(
  pids: string[],
  options: { categorySlug?: string; published?: boolean; addToMyProduct?: boolean } = {}
) {
  const imported: CjImportedSummary[] = [];
  const errors: Array<{ pid: string; error: string }> = [];
  for (const pid of pids) {
    try {
      const result = await importCjProduct(pid, options);
      imported.push({
        slug: result.product.slug,
        name: result.product.name,
        pid: result.product.cjPid,
        price: result.product.price,
        vendorCost: result.product.vendorCost,
      });
    } catch (err) {
      errors.push({ pid, error: err instanceof Error ? err.message : "Import failed" });
    }
  }
  return { imported, errors };
}