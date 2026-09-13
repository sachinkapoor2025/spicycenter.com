/**
 * Re-attach admin-uploaded images from S3 (`products/<slug>/<file>`) onto DynamoDB products.
 * Use after a catalog import wiped gallery URLs while objects still exist in the upload bucket.
 *
 *   ENVIRONMENT=prod npm run restore:admin-images
 *   ENVIRONMENT=prod npm run restore:admin-images -- --dry-run
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import {
  DEFAULT_PRODUCT_CDN,
  isAdminUploadedProductImage,
  productKeys,
} from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
const UPLOAD_BUCKET =
  process.env.UPLOAD_BUCKET ?? "spicycorner-prod-uploadbucket-dyr0xdywradd";
const CDN = (process.env.CLOUDFRONT_DOMAIN ?? DEFAULT_PRODUCT_CDN.replace(/^https?:\/\//, ""))
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const DRY_RUN = process.argv.includes("--dry-run");

function isPlaceholderUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("product-fallback") ||
    u.includes("_placeholder") ||
    u.includes("/logo.png") ||
    u.includes("logo-option") ||
    u.includes("placeholder.jpg") ||
    u.includes("placeholder.svg")
  );
}

/** Prefer full CDN URLs for legacy /uploads/... paths stored relatively. */
function toCanonicalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/uploads/")) return `https://${CDN}${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `https://${CDN}/${trimmed}`;
  if (trimmed.startsWith("/products/")) return `https://${CDN}${trimmed}`;
  return trimmed;
}

async function listAdminImagesBySlug(s3: S3Client): Promise<Map<string, string[]>> {
  const bySlug = new Map<string, string[]>();
  let token: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: UPLOAD_BUCKET,
        Prefix: "products/",
        ContinuationToken: token,
      })
    );

    for (const obj of page.Contents ?? []) {
      const key = obj.Key;
      if (!key || key.endsWith("/")) continue;
      // products/<slug>/<uuid>.ext
      const parts = key.split("/");
      if (parts.length < 3 || parts[0] !== "products") continue;
      const slug = parts[1];
      if (!slug) continue;
      const url = `https://${CDN}/${key}`;
      const list = bySlug.get(slug) ?? [];
      list.push(url);
      bySlug.set(slug, list);
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  for (const [slug, urls] of bySlug) {
    urls.sort();
    bySlug.set(slug, urls);
  }

  return bySlug;
}

async function main() {
  console.log(`Restore admin images → ${PRODUCTS_TABLE}`);
  console.log(`Bucket: ${UPLOAD_BUCKET}  CDN: ${CDN}  dryRun=${DRY_RUN}`);

  const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  const doc = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" })
  );

  const bySlug = await listAdminImagesBySlug(s3);
  console.log(`Found admin uploads for ${bySlug.size} product slugs in S3`);

  let scanned = 0;
  let updated = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const page = await doc.send(
      new ScanCommand({ TableName: PRODUCTS_TABLE, ExclusiveStartKey: lastKey })
    );

    for (const item of page.Items ?? []) {
      if (item.SK !== "META" || !String(item.PK).startsWith("PRODUCT#")) continue;
      scanned++;
      const slug = String(item.slug ?? "");
      const adminFromS3 = bySlug.get(slug) ?? [];
      const current = ((item.images as string[]) ?? []).map(toCanonicalUrl).filter(Boolean);
      const keepCurrent = current.filter(
        (u) => isAdminUploadedProductImage(u) || !isPlaceholderUrl(u)
      );

      // Prefer admin S3 uploads exclusively when present (catalog often has missing-image placeholders)
      const next =
        adminFromS3.length > 0
          ? adminFromS3
          : keepCurrent.length > 0
            ? keepCurrent
            : current;

      if (next.length === 0) continue;
      if (next.join("|") === current.join("|")) continue;

      console.log(
        `  ${slug}: ${current.length} → ${next.length} images (${adminFromS3.length} from S3)`
      );

      if (!DRY_RUN) {
        await doc.send(
          new PutCommand({
            TableName: PRODUCTS_TABLE,
            Item: {
              ...item,
              images: next,
              PK: productKeys.pk(slug),
              SK: productKeys.sk(),
              updatedAt: new Date().toISOString(),
            },
          })
        );
      }
      updated++;
    }

    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Done. scanned=${scanned} updated=${updated} dryRun=${DRY_RUN}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
