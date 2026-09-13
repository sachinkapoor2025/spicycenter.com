/**
 * Attach orphaned admin uploads from S3 (products/*) to DynamoDB products.
 * Uses CONFIG upload registry when available; otherwise attaches any S3 URL
 * not already linked to a product if it matches a registry entry.
 *
 * Usage:
 *   ENVIRONMENT=prod UPLOAD_BUCKET=spicycorner-prod-uploadbucket-dyr0xdywradd CLOUDFRONT_DOMAIN=d2lfdzx32wxe94.cloudfront.net npx tsx scripts/reconcile-s3-product-images.ts
 */
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { mergeProductImages, productKeys, uploadRegistryKeys } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
const CONFIG_TABLE = process.env.CONFIG_TABLE ?? `spicycorner-config-${ENV}`;
const BUCKET = process.env.UPLOAD_BUCKET;
const CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? "d2lfdzx32wxe94.cloudfront.net";

function getDocClient() {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" })
  );
}

function publicUrl(key: string): string {
  return `https://${CDN_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${key}`;
}

async function loadRegistry(docClient: DynamoDBDocumentClient): Promise<Map<string, string[]>> {
  const bySlug = new Map<string, string[]>();
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: CONFIG_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "UPLOAD#", ":sk": "META" },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of page.Items ?? []) {
      const slug = item.productSlug as string | undefined;
      const imageUrl = item.imageUrl as string | undefined;
      if (!slug || !imageUrl) continue;
      const list = bySlug.get(slug) ?? [];
      list.push(imageUrl);
      bySlug.set(slug, list);
    }
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return bySlug;
}

async function main() {
  if (!BUCKET) throw new Error("UPLOAD_BUCKET required");

  const docClient = getDocClient();
  const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  const timestamp = new Date().toISOString();

  const registry = await loadRegistry(docClient);
  console.log(`Upload registry entries for ${registry.size} slugs`);

  const allUrls: { key: string; url: string }[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "products/", ContinuationToken: token })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Key.endsWith("/")) continue;
      allUrls.push({ key: obj.Key, url: publicUrl(obj.Key) });
    }
    token = res.NextContinuationToken;
  } while (token);

  console.log(`Found ${allUrls.length} files under products/ in S3`);

  const linked = new Set<string>();
  let lastKey: Record<string, unknown> | undefined;
  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of page.Items ?? []) {
      for (const url of (item.images as string[] | undefined) ?? []) linked.add(url);
    }
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  let updated = 0;
  for (const [slug, urls] of registry.entries()) {
    const toAdd = urls.filter((u) => !linked.has(u));
    if (!toAdd.length) continue;

    const current = await docClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
      })
    );
    if (!current.Item) continue;

    const currentImages = (current.Item.images as string[] | undefined) ?? [];
    const merged = mergeProductImages(currentImages, toAdd);
    if (merged.length === currentImages.length) continue;

    await docClient.send(
      new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: { ...current.Item, images: merged, updatedAt: timestamp },
      })
    );
    updated++;
    console.log(`  registry ${slug}: +${merged.length - currentImages.length} images`);
  }

  const orphans = allUrls.filter(({ url }) => !linked.has(url)).length;
  console.log(`\nUpdated ${updated} products from registry. ${orphans} S3 files still not linked to any product.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
