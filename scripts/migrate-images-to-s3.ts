/**
 * Migrate WordPress product/media images to S3 + CloudFront and update DynamoDB.
 *
 * Why: spicycenter.com now points to Amplify (Next.js). Old wp-content URLs 404.
 *
 * Usage (after exporting wp-content/uploads from WordPress hosting):
 *   ENVIRONMENT=prod \
 *   UPLOAD_BUCKET=spicycorner-upload-prod-xxxxx \
 *   CLOUDFRONT_DOMAIN=dxxxx.cloudfront.net \
 *   LOCAL_UPLOADS_DIR=/path/to/wp-content/uploads \
 *   npm run migrate:images
 *
 * Or download from a still-live WordPress origin:
 *   WORDPRESS_ORIGIN=https://your-old-host.example.com \
 *   npm run migrate:images
 *
 * Get bucket + CloudFront from: aws cloudformation describe-stacks --stack-name spicycorner-prod
 */
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { productKeys } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
const BUCKET = process.env.UPLOAD_BUCKET;
const CDN = process.env.CLOUDFRONT_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const WP_ORIGIN = process.env.WORDPRESS_ORIGIN?.replace(/\/$/, "");
const LOCAL_UPLOADS = process.env.LOCAL_UPLOADS_DIR;

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function wpPathFromUrl(url: string): string | null {
  const m = url.match(/\/wp-content\/uploads\/(.+)$/i);
  return m ? m[1] : null;
}

function cdnUrl(relativePath: string): string {
  if (!CDN) throw new Error("CLOUDFRONT_DOMAIN is required");
  return `https://${CDN}/uploads/${relativePath}`;
}

function s3Key(relativePath: string): string {
  return `uploads/${relativePath}`;
}

async function readImageBytes(relativePath: string): Promise<Buffer | null> {
  if (LOCAL_UPLOADS) {
    const local = join(LOCAL_UPLOADS, relativePath);
    if (existsSync(local)) return readFileSync(local);
  }
  if (WP_ORIGIN) {
    const res = await fetch(`${WP_ORIGIN}/wp-content/uploads/${relativePath}`);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

async function ensureUploaded(
  s3: S3Client,
  relativePath: string,
  cache: Map<string, string>
): Promise<string | null> {
  if (cache.has(relativePath)) return cache.get(relativePath)!;

  if (!BUCKET) throw new Error("UPLOAD_BUCKET is required");
  const key = s3Key(relativePath);

  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    const url = cdnUrl(relativePath);
    cache.set(relativePath, url);
    return url;
  } catch {
    /* not in bucket yet */
  }

  const bytes = await readImageBytes(relativePath);
  if (!bytes) {
    console.warn(`  ✗ missing: ${relativePath}`);
    return null;
  }

  const ext = extname(relativePath).toLowerCase();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bytes,
      ContentType: MIME[ext] ?? "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const url = cdnUrl(relativePath);
  cache.set(relativePath, url);
  console.log(`  ✓ uploaded: ${relativePath}`);
  return url;
}

async function migrateProductImages(
  s3: S3Client,
  cache: Map<string, string>,
  images: string[]
): Promise<string[]> {
  const out: string[] = [];
  for (const img of images) {
    if (!img) continue;
    if (CDN && img.includes(CDN)) {
      out.push(img);
      continue;
    }
    const rel = wpPathFromUrl(img);
    if (!rel) {
      out.push(img);
      continue;
    }
    const migrated = await ensureUploaded(s3, rel, cache);
    if (migrated) out.push(migrated);
  }
  return out;
}

async function main() {
  if (!BUCKET || !CDN) {
    console.error("Set UPLOAD_BUCKET and CLOUDFRONT_DOMAIN (from CloudFormation outputs).");
    process.exit(1);
  }
  if (!LOCAL_UPLOADS && !WP_ORIGIN) {
    console.error(
      "Set LOCAL_UPLOADS_DIR (exported wp-content/uploads folder) or WORDPRESS_ORIGIN (old WordPress URL)."
    );
    process.exit(1);
  }

  const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  const doc = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" })
  );

  const cache = new Map<string, string>();
  let updated = 0;
  let lastKey: Record<string, unknown> | undefined;

  console.log(`Scanning ${PRODUCTS_TABLE}...`);

  do {
    const page = await doc.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of page.Items ?? []) {
      if (item.SK !== "META" || !String(item.PK).startsWith("PRODUCT#")) continue;
      const images = (item.images as string[]) ?? [];
      if (images.length === 0) continue;

      const migrated = await migrateProductImages(s3, cache, images);
      if (migrated.length === 0 || migrated.join("|") === images.join("|")) continue;

      await doc.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: { ...item, images: migrated, updatedAt: new Date().toISOString() },
        })
      );
      updated++;
      console.log(`Updated ${item.slug ?? item.PK}`);
    }

    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Done. ${updated} products updated, ${cache.size} unique images on CDN.`);
  console.log(`Set Amplify env: NEXT_PUBLIC_CDN_URL=https://${CDN}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
