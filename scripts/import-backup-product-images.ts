/**
 * Import product images from a backup S3 bucket (folder per product name),
 * fuzzy-match folders to SpicyCorner catalog products, compress, upload to
 * the SpicyCorner CDN bucket, and attach 2–4 images per product.
 *
 * Prerequisites:
 *   - AWS CLI credentials in environment (default profile) with:
 *       s3:ListBucket, s3:GetObject on SOURCE_BUCKET
 *       s3:PutObject, s3:HeadObject on UPLOAD_BUCKET
 *       dynamodb:Scan, dynamodb:PutItem on PRODUCTS_TABLE (optional)
 *   - npm install (includes sharp)
 *
 * Get SpicyCorner bucket + CloudFront from prod stack:
 *   aws cloudformation describe-stacks --stack-name spicycorner-prod \
 *     --query 'Stacks[0].Outputs'
 *
 * Usage:
 *   # Preview fuzzy matches only (no downloads/uploads)
 *   npm run import:backup-images -- --match-only
 *
 *   # Full import (catalog JSON + public/uploads; DynamoDB if table exists)
 *   SOURCE_BUCKET=spicycorner-backup \
 *   UPLOAD_BUCKET=spicycorner-upload-prod-xxxxx \
 *   CLOUDFRONT_DOMAIN=d2lfdzx32wxe94.cloudfront.net \
 *   npm run import:backup-images
 *
 *   # Dry-run: match + download + compress locally, skip S3 upload & DB writes
 *   npm run import:backup-images -- --dry-run
 *
 *   # Override confidence threshold (0–1, default 0.72)
 *   npm run import:backup-images -- --min-confidence 0.8
 *
 *   # Manual folder → slug overrides (JSON object)
 *   npm run import:backup-images -- --manual-map '{"My Folder Name":"product-slug"}'
 *
 *   # Local folder mirror instead of S3 source (same folder-per-product layout)
 *   LOCAL_BACKUP_DIR=/path/to/backup npm run import:backup-images
 *
 * Env vars:
 *   SOURCE_BUCKET       default: spicycorner-backup
 *   SOURCE_PREFIX       default: spicycenter.com (product folders under this prefix in backup bucket)
 *   UPLOAD_BUCKET       required for upload (from SAM UploadBucket output)
 *   CLOUDFRONT_DOMAIN   default: d2lfdzx32wxe94.cloudfront.net
 *   PRODUCTS_TABLE      default: spicycorner-products-prod
 *   CATALOG_PATH        default: scripts/data/spicycenter-catalog.json
 *   AWS_REGION          default: us-east-1
 *   UPLOAD_PREFIX       default: 2026/06  (path under uploads/)
 *   SKIP_DYNAMODB       set to 1 to skip DynamoDB updates
 *   SYNC_PUBLIC         set to 0 to skip apps/web/public/uploads sync
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, extname, basename, dirname } from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { DEFAULT_PRODUCT_CDN, productKeys } from "@spicycorner/shared";
import sharp from "sharp";

// ---- config ----

const ENV = process.env.ENVIRONMENT ?? "prod";
const SOURCE_BUCKET = process.env.SOURCE_BUCKET ?? "spicycorner-backup";
const SOURCE_PREFIX = (
  process.env.SOURCE_PREFIX ??
  (process.env.SOURCE_BUCKET === undefined || process.env.SOURCE_BUCKET === "spicycorner-backup"
    ? "spicycenter.com"
    : "")
).replace(/^\/+|\/+$/g, "");
const UPLOAD_BUCKET =
  process.env.UPLOAD_BUCKET ?? "spicycorner-prod-uploadbucket-dyr0xdywradd";
const CDN = (
  process.env.CLOUDFRONT_DOMAIN ??
  DEFAULT_PRODUCT_CDN.replace(/^https?:\/\//, "")
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const PRODUCTS_TABLE =
  process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
const CATALOG_PATH =
  process.env.CATALOG_PATH ??
  join(process.cwd(), "scripts/data/spicycenter-catalog.json");
const PUBLIC_ROOT = join(process.cwd(), "apps/web/public/uploads");
const UPLOAD_PREFIX = (process.env.UPLOAD_PREFIX ?? "2026/06").replace(
  /^\/+|\/+$/g,
  ""
);
const REGION = process.env.AWS_REGION ?? "us-east-1";
const MIN_CONFIDENCE = parseFloat(
  process.argv.includes("--min-confidence")
    ? process.argv[process.argv.indexOf("--min-confidence") + 1]
    : (process.env.MIN_MATCH_CONFIDENCE ?? "0.72")
);
const MAX_IMAGES = 4;
const MIN_IMAGES = 2;
const MAX_DIMENSION = 1500;
const TARGET_MAX_BYTES = 400_000;
const JPEG_QUALITY = 82;
const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".tiff",
]);

const DRY_RUN = process.argv.includes("--dry-run");
const MATCH_ONLY = process.argv.includes("--match-only");
const SKIP_DYNAMODB = process.env.SKIP_DYNAMODB === "1";
const SYNC_PUBLIC = process.env.SYNC_PUBLIC !== "0";
const LOCAL_BACKUP = process.env.LOCAL_BACKUP_DIR;

// ---- types ----

interface CatalogProduct {
  name: string;
  slug: string;
  images?: string[];
}

interface CatalogFile {
  categories?: unknown[];
  products: CatalogProduct[];
}

interface BackupFolder {
  prefix: string;
  name: string;
  files: string[];
}

interface MatchResult {
  folder: string;
  productSlug: string;
  productName: string;
  score: number;
  method: string;
}

interface CompressionStats {
  count: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
}

// ---- fuzzy matching ----

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "of",
  "to",
  "in",
  "on",
  "pack",
  "set",
  "pcs",
  "pc",
  "piece",
  "pieces",
  "spice",
  "usa",
  "us",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function levenshteinRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function scoreFolderToProduct(
  folderName: string,
  product: CatalogProduct
): { score: number; method: string } {
  const folderNorm = normalize(folderName);
  const slugNorm = normalize(product.slug.replace(/-/g, " "));
  const nameNorm = normalize(product.name);

  const folderTok = tokens(folderName);
  const slugTok = tokens(product.slug.replace(/-/g, " "));
  const nameTok = tokens(product.name);

  const slugLev = levenshteinRatio(folderNorm, slugNorm);
  const nameLev = levenshteinRatio(folderNorm, nameNorm);
  const slugJac = jaccard(folderTok, slugTok);
  const nameJac = jaccard(folderTok, nameTok);

  // Substring bonus when one normalized string contains the other
  let containBonus = 0;
  if (
    folderNorm.includes(slugNorm) ||
    slugNorm.includes(folderNorm) ||
    folderNorm.includes(nameNorm) ||
    nameNorm.includes(folderNorm)
  ) {
    containBonus = 0.15;
  }

  const score = Math.max(
    slugLev * 0.35 + slugJac * 0.65,
    nameLev * 0.35 + nameJac * 0.65
  ) + containBonus;

  const method =
    slugJac >= nameJac
      ? `slug(jac=${slugJac.toFixed(2)},lev=${slugLev.toFixed(2)})`
      : `name(jac=${nameJac.toFixed(2)},lev=${nameLev.toFixed(2)})`;

  return { score: Math.min(score, 1), method };
}

function buildMatches(
  folders: BackupFolder[],
  products: CatalogProduct[],
  manualMap: Record<string, string>,
  minConfidence: number
): {
  matches: MatchResult[];
  uncertain: MatchResult[];
  unmatchedFolders: string[];
  unmatchedProducts: string[];
} {
  const matchedSlugs = new Set<string>();
  const matches: MatchResult[] = [];
  const uncertain: MatchResult[] = [];
  const unmatchedFolders: string[] = [];

  for (const folder of folders) {
    const manualSlug = manualMap[folder.name] ?? manualMap[folder.prefix];
    if (manualSlug) {
      const product = products.find((p) => p.slug === manualSlug);
      if (product) {
        matches.push({
          folder: folder.name,
          productSlug: product.slug,
          productName: product.name,
          score: 1,
          method: "manual",
        });
        matchedSlugs.add(product.slug);
        continue;
      }
      console.warn(`  manual map slug not found: ${manualSlug}`);
    }

    let best: MatchResult | null = null;
    for (const product of products) {
      const { score, method } = scoreFolderToProduct(folder.name, product);
      if (!best || score > best.score) {
        best = {
          folder: folder.name,
          productSlug: product.slug,
          productName: product.name,
          score,
          method,
        };
      }
    }

    if (!best) continue;

    if (best.score >= minConfidence) {
      // Avoid duplicate slug assignment — keep highest score
      const existing = matches.find((m) => m.productSlug === best!.productSlug);
      if (existing) {
        if (best.score > existing.score) {
          matches.splice(matches.indexOf(existing), 1);
          unmatchedFolders.push(existing.folder);
          matches.push(best);
          matchedSlugs.add(best.productSlug);
        } else {
          unmatchedFolders.push(folder.name);
        }
      } else {
        matches.push(best);
        matchedSlugs.add(best.productSlug);
      }
    } else if (best.score >= minConfidence - 0.12) {
      uncertain.push(best);
      unmatchedFolders.push(folder.name);
    } else {
      unmatchedFolders.push(folder.name);
    }
  }

  const unmatchedProducts = products
    .filter((p) => !matchedSlugs.has(p.slug))
    .map((p) => p.slug);

  return { matches, uncertain, unmatchedFolders, unmatchedProducts };
}

// ---- S3 / filesystem ----

async function listBackupFoldersS3(
  s3: S3Client,
  bucket: string
): Promise<BackupFolder[]> {
  const folders = new Map<string, BackupFolder>();
  let token: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ...(SOURCE_PREFIX ? { Prefix: `${SOURCE_PREFIX}/` } : {}),
        Delimiter: "/",
        ContinuationToken: token,
      })
    );

    for (const cp of res.CommonPrefixes ?? []) {
      const prefix = cp.Prefix?.replace(/\/$/, "") ?? "";
      const name = prefix.split("/").pop() ?? prefix;
      if (name) folders.set(prefix, { prefix, name, files: [] });
    }

    token = res.NextContinuationToken;
  } while (token);

  // List files inside each folder
  for (const folder of folders.values()) {
    let fileToken: string | undefined;
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${folder.prefix}/`,
          ContinuationToken: fileToken,
        })
      );
      for (const obj of res.Contents ?? []) {
        const key = obj.Key ?? "";
        if (key.endsWith("/")) continue;
        const ext = extname(key).toLowerCase();
        if (IMAGE_EXT.has(ext)) folder.files.push(key);
      }
      fileToken = res.NextContinuationToken;
    } while (fileToken);
    folder.files.sort();
  }

  return [...folders.values()].filter((f) => f.files.length > 0);
}

function listBackupFoldersLocal(root: string): BackupFolder[] {
  const out: BackupFolder[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (!statSync(full).isDirectory()) continue;
    const files = readdirSync(full)
      .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
      .map((f) => join(full, f))
      .sort();
    if (files.length) out.push({ prefix: entry, name: entry, files });
  }
  return out;
}

async function downloadS3Object(
  s3: S3Client,
  bucket: string,
  key: string
): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object: s3://${bucket}/${key}`);
  return Buffer.from(bytes);
}

function readLocalFile(path: string): Buffer {
  return readFileSync(path);
}

async function compressImage(input: Buffer): Promise<{
  buffer: Buffer;
  originalBytes: number;
  compressedBytes: number;
}> {
  const originalBytes = input.length;
  let quality = JPEG_QUALITY;
  let buffer = await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  while (buffer.length > TARGET_MAX_BYTES && quality > 50) {
    quality -= 8;
    buffer = await sharp(input)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  }

  return { buffer, originalBytes, compressedBytes: buffer.length };
}

function cdnUrl(relativePath: string): string {
  return `https://${CDN}/uploads/${relativePath}`;
}

function s3Key(relativePath: string): string {
  return `uploads/${relativePath}`;
}

function destFilename(slug: string, index: number): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-");
  return `${safe}-${index + 1}.webp`;
}

async function ensureUploaded(
  s3: S3Client,
  relativePath: string,
  body: Buffer
): Promise<string> {
  if (!UPLOAD_BUCKET) throw new Error("UPLOAD_BUCKET is required for upload");
  const key = s3Key(relativePath);

  if (!DRY_RUN) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key }));
      return cdnUrl(relativePath);
    } catch {
      /* not present */
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: UPLOAD_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  }

  return cdnUrl(relativePath);
}

function syncToPublic(relativePath: string, body: Buffer): void {
  if (!SYNC_PUBLIC || DRY_RUN) return;
  const dest = join(PUBLIC_ROOT, relativePath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body);
}

function parseManualMap(): Record<string, string> {
  const idx = process.argv.indexOf("--manual-map");
  if (idx === -1) return {};
  try {
    return JSON.parse(process.argv[idx + 1]) as Record<string, string>;
  } catch {
    console.error("Invalid --manual-map JSON");
    process.exit(1);
  }
}

async function tableExists(doc: DynamoDBDocumentClient): Promise<boolean> {
  if (SKIP_DYNAMODB) return false;
  try {
    await doc.send(new ScanCommand({ TableName: PRODUCTS_TABLE, Limit: 1 }));
    return true;
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function updateDynamoProduct(
  doc: DynamoDBDocumentClient,
  slug: string,
  images: string[]
): Promise<boolean> {
  let lastKey: Record<string, unknown> | undefined;
  do {
    const page = await doc.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of page.Items ?? []) {
      if (item.SK !== "META" || item.slug !== slug) continue;
      if (DRY_RUN) return true;
      await doc.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: {
            ...item,
            images,
            updatedAt: new Date().toISOString(),
          },
        })
      );
      return true;
    }
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);
  return false;
}

// ---- main ----

async function main() {
  console.log("=== Import backup product images ===\n");
  console.log(`Source bucket:  ${LOCAL_BACKUP ? LOCAL_BACKUP : `s3://${SOURCE_BUCKET}${SOURCE_PREFIX ? `/${SOURCE_PREFIX}` : ""}`}`);
  console.log(`Upload bucket:  ${UPLOAD_BUCKET ?? "(not set)"}`);
  console.log(`CloudFront:     https://${CDN}`);
  console.log(`Catalog:        ${CATALOG_PATH}`);
  console.log(`Upload prefix:  uploads/${UPLOAD_PREFIX}/`);
  console.log(`Min confidence: ${MIN_CONFIDENCE}`);
  if (DRY_RUN) console.log("Mode:           DRY RUN");
  if (MATCH_ONLY) console.log("Mode:           MATCH ONLY");
  console.log("");

  if (!existsSync(CATALOG_PATH)) {
    console.error(`Missing catalog: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as CatalogFile;
  const products = catalog.products ?? [];
  console.log(`Loaded ${products.length} catalog products.`);

  const s3 = new S3Client({ region: REGION });
  let folders: BackupFolder[];

  if (LOCAL_BACKUP) {
    if (!existsSync(LOCAL_BACKUP)) {
      console.error(`LOCAL_BACKUP_DIR not found: ${LOCAL_BACKUP}`);
      process.exit(1);
    }
    folders = listBackupFoldersLocal(LOCAL_BACKUP);
  } else {
    try {
      folders = await listBackupFoldersS3(s3, SOURCE_BUCKET);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nFailed to list s3://${SOURCE_BUCKET}/`);
      console.error(msg);
      console.error(
        "\nBlocker: IAM user needs s3:ListBucket + s3:GetObject on the source bucket."
      );
      console.error(
        "Alternatively export a local copy and set LOCAL_BACKUP_DIR=/path/to/folders"
      );
      process.exit(1);
    }
  }

  console.log(`Found ${folders.length} backup folders with images.\n`);

  const manualMap = parseManualMap();
  const { matches, uncertain, unmatchedFolders, unmatchedProducts } =
    buildMatches(folders, products, manualMap, MIN_CONFIDENCE);

  console.log("--- Match mapping (folder → product slug) ---");
  for (const m of matches.sort((a, b) => a.folder.localeCompare(b.folder))) {
    console.log(
      `  ${m.score.toFixed(3)}  "${m.folder}" → ${m.productSlug}  (${m.method})`
    );
  }

  if (uncertain.length) {
    console.log("\n--- Uncertain matches (manual review) ---");
    for (const u of uncertain) {
      console.log(
        `  ${u.score.toFixed(3)}  "${u.folder}" → ${u.productSlug}?  (${u.method})`
      );
    }
  }

  console.log(`\nMatched: ${matches.length} folders`);
  console.log(`Unmatched folders: ${unmatchedFolders.length}`);
  console.log(`Unmatched products: ${unmatchedProducts.length}`);

  if (MATCH_ONLY) {
    if (unmatchedFolders.length) {
      console.log("\nUnmatched folder names:");
      for (const f of unmatchedFolders.sort()) console.log(`  - ${f}`);
    }
    return;
  }

  if (!UPLOAD_BUCKET && !DRY_RUN) {
    console.error("\nSet UPLOAD_BUCKET (SpicyCorner SAM UploadBucket output).");
    process.exit(1);
  }

  const compression: CompressionStats = {
    count: 0,
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
  };
  let totalUploaded = 0;
  let productsUpdated = 0;
  const slugToImages = new Map<string, string[]>();

  for (const match of matches) {
    const folder = folders.find((f) => f.name === match.folder);
    if (!folder || folder.files.length === 0) continue;

    const selected = folder.files.slice(0, MAX_IMAGES);
    if (selected.length < MIN_IMAGES && folder.files.length >= MIN_IMAGES) {
      /* use what we have */
    }

    const imageUrls: string[] = [];
    console.log(
      `\nProcessing "${match.folder}" → ${match.productSlug} (${selected.length} images)`
    );

    for (let i = 0; i < selected.length; i++) {
      const src = selected[i];
      const rel = `${UPLOAD_PREFIX}/${destFilename(match.productSlug, i)}`;

      let raw: Buffer;
      if (LOCAL_BACKUP) {
        raw = readLocalFile(src);
      } else {
        raw = await downloadS3Object(s3, SOURCE_BUCKET, src);
      }

      const { buffer, originalBytes, compressedBytes } = await compressImage(raw);
      compression.count++;
      compression.totalOriginalBytes += originalBytes;
      compression.totalCompressedBytes += compressedBytes;

      const url = await ensureUploaded(s3, rel, buffer);
      syncToPublic(rel, buffer);
      imageUrls.push(url);
      totalUploaded++;

      console.log(
        `  ✓ ${basename(src)} → ${rel} (${Math.round(originalBytes / 1024)}KB → ${Math.round(compressedBytes / 1024)}KB)`
      );
    }

    if (imageUrls.length >= 1) {
      slugToImages.set(match.productSlug, imageUrls);
    }
  }

  // Update catalog JSON
  if (slugToImages.size > 0 && !DRY_RUN) {
    for (const p of catalog.products) {
      const imgs = slugToImages.get(p.slug);
      if (imgs?.length) p.images = imgs;
    }
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
    console.log(`\nUpdated ${CATALOG_PATH}`);
  }

  // DynamoDB
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  const hasTable = await tableExists(doc);
  if (hasTable) {
    for (const [slug, images] of slugToImages) {
      const ok = await updateDynamoProduct(doc, slug, images);
      if (ok) {
        productsUpdated++;
        console.log(`  DynamoDB updated: ${slug}`);
      }
    }
  } else {
    console.log(`\nDynamoDB table ${PRODUCTS_TABLE} not found — skipped DB updates.`);
  }

  console.log("\n=== Summary ===");
  console.log(`Matched folders:     ${matches.length}`);
  console.log(`Unmatched folders:   ${unmatchedFolders.length}`);
  console.log(`Unmatched products:  ${unmatchedProducts.length}`);
  console.log(`Images uploaded:     ${totalUploaded}`);
  console.log(`Products w/ images:  ${slugToImages.size}`);
  console.log(`Catalog updated:     ${!DRY_RUN && slugToImages.size > 0}`);
  console.log(`DynamoDB updated:    ${productsUpdated}`);
  if (compression.count) {
    const saved =
      compression.totalOriginalBytes - compression.totalCompressedBytes;
    console.log(
      `Compression:         ${compression.count} images, ${Math.round(compression.totalOriginalBytes / 1024)}KB → ${Math.round(compression.totalCompressedBytes / 1024)}KB (saved ${Math.round(saved / 1024)}KB)`
    );
  }
  if (unmatchedFolders.length) {
    console.log("\nUnmatched folders:");
    for (const f of unmatchedFolders.sort().slice(0, 30)) console.log(`  - ${f}`);
    if (unmatchedFolders.length > 30)
      console.log(`  ... and ${unmatchedFolders.length - 30} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
