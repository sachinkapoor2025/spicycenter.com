/**
 * Re-match + re-upload inventory-2 Orange County images from the vendor RAR,
 * then patch DynamoDB `images` arrays (does not change prices/names).
 *
 *   ENVIRONMENT=prod UPLOAD_BUCKET=... CLOUDFRONT_DOMAIN=... \
 *     npx tsx scripts/fix-inventory-2-images.ts
 */
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join, extname, basename, resolve } from "path";
import { execSync } from "child_process";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { productKeys } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
const BUCKET = process.env.UPLOAD_BUCKET;
const CDN = process.env.CLOUDFRONT_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const ROOT = resolve(process.cwd());
const EXTRACT_DIR = join(ROOT, "docs/_oc-single-rakhi-images");
const RAR_CANDIDATES = [
  join(ROOT, "docs/USA Rakhi Images1.rar"),
  "/Users/sachinkapoor/Downloads/USA Rakhi Images1.rar",
];
const PUBLIC_IMG = join(ROOT, "apps/web/public/uploads/orange-county");
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function stemOf(file: string): string {
  return file
    .replace(/\.(jpe?g|png|webp)$/i, "")
    .toLowerCase()
    .replace(/[`']/g, "")
    .replace(/\s+/g, "")
    .replace(/\(1\)/g, "");
}

function imagesForSku(sku: string, files: string[]): string[] {
  const base = sku.toLowerCase().replace(/[`'\s]/g, "");
  const scored: { file: string; score: number }[] = [];
  for (const file of files) {
    const stem = stemOf(file);
    if (stem === base) {
      scored.push({ file, score: 100 });
      continue;
    }
    if (new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-z]$`, "i").test(stem)) {
      scored.push({ file, score: 95 });
      continue;
    }
    if (stem.startsWith(base)) {
      const rest = stem.slice(base.length);
      if (!rest || /^[a-z]$/i.test(rest)) {
        scored.push({ file, score: 95 });
        continue;
      }
      if (/^[-_]?setof?\d*/i.test(rest)) {
        scored.push({ file, score: 90 });
        continue;
      }
      // QT2 / pack codes — keep alongside primary
      if (/^[a-z]{2,}\d*/i.test(rest) && !/^[-_]?\d/.test(rest)) {
        scored.push({ file, score: 90 });
        continue;
      }
    }
  }
  return scored
    .filter((s) => s.score >= 80)
    .map((s) => s.file)
    .sort((a, b) => {
      const sa = stemOf(a);
      const sb = stemOf(b);
      if (sa === base) return -1;
      if (sb === base) return 1;
      return sa.localeCompare(sb);
    });
}

function listImageFiles(dirs: string[]): { file: string; dir: string }[] {
  const out: { file: string; dir: string }[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (/\.(jpe?g|png|webp)$/i.test(file)) out.push({ file, dir });
    }
  }
  return out;
}

function ensureExtracted(): string {
  const dest = join(EXTRACT_DIR, "USA Rakhi Images1");
  if (existsSync(dest) && readdirSync(dest).some((f) => /\.jpe?g$/i.test(f))) {
    return dest;
  }
  mkdirSync(EXTRACT_DIR, { recursive: true });
  const rar = RAR_CANDIDATES.find((p) => existsSync(p));
  if (!rar) throw new Error("USA Rakhi Images1.rar not found in docs/ or Downloads/");
  try {
    execSync(`bsdtar -xf "${rar}" -C "${EXTRACT_DIR}"`, { stdio: "inherit" });
  } catch {
    execSync(`unar -f -o "${EXTRACT_DIR}" "${rar}"`, { stdio: "inherit" });
  }
  if (!existsSync(dest)) throw new Error(`Extract failed — missing ${dest}`);
  return dest;
}

async function main() {
  if (!BUCKET || !CDN) throw new Error("UPLOAD_BUCKET and CLOUDFRONT_DOMAIN required");

  const imgDir = ensureExtracted();
  const all = listImageFiles([imgDir, join(EXTRACT_DIR, "from-excel")]);
  const fileNames = all.map((i) => i.file);
  console.log(`Image pool: ${fileNames.length} files from ${imgDir}`);

  const ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_DEFAULT_REGION || "us-east-1" })
  );
  const s3 = new S3Client({ region: process.env.AWS_DEFAULT_REGION || "us-east-1" });

  const scan = await ddb.send(
    new ScanCommand({
      TableName: PRODUCTS_TABLE,
      FilterExpression: "inventoryBatch = :b",
      ExpressionAttributeValues: { ":b": "inventory-2" },
      ProjectionExpression: "slug, sku, images",
    })
  );
  const products = (scan.Items ?? []) as { slug: string; sku: string; images?: string[] }[];
  console.log(`Inventory-2 products: ${products.length}`);

  const report: { sku: string; before: number; after: number; files: string[] }[] = [];

  for (const product of products.sort((a, b) => a.sku.localeCompare(b.sku))) {
    const matched = imagesForSku(product.sku, fileNames);
    // Avoid sibling SKU bleed for short codes (TFPRD00312 vs TFPRD00312-338)
    const files = matched.filter((f) => {
      if (product.sku === "TFPRD00312") {
        return !/00312-338/i.test(f);
      }
      return true;
    });

    const folder = product.sku.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const destDir = join(PUBLIC_IMG, folder);
    mkdirSync(destDir, { recursive: true });

    const cdnUrls: string[] = [];
    const used = new Set<string>();
    for (const file of files) {
      const srcEntry = all.find((i) => i.file === file);
      if (!srcEntry) continue;
      const safeName = basename(file).replace(/[`']/g, "").replace(/\s+/g, "-");
      if (used.has(safeName.toLowerCase())) continue;
      used.add(safeName.toLowerCase());
      const localPath = join(srcEntry.dir, file);
      const destPath = join(destDir, safeName);
      copyFileSync(localPath, destPath);
      const key = `uploads/orange-county/${folder}/${safeName}`;
      const url = `https://${CDN}/${key}`;
      if (!DRY_RUN) {
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: readFileSync(localPath),
            ContentType: MIME[extname(safeName).toLowerCase()] ?? "image/jpeg",
            CacheControl: "public, max-age=31536000, immutable",
          })
        );
        console.log(`  ↑ ${key}`);
      }
      cdnUrls.push(url);
    }

    // Merge newly matched RAR files with existing DB images (excel masters, etc.)
    const before = product.images?.length ?? 0;
    const seen = new Set<string>();
    const nextImages: string[] = [];
    const add = (url: string) => {
      const key = url.split("?")[0]!.toLowerCase();
      const pathKey = key.replace(/^https?:\/\/[^/]+/i, "");
      if (seen.has(pathKey)) return;
      seen.add(pathKey);
      nextImages.push(url);
    };
    for (const u of cdnUrls) add(u);
    for (const u of product.images ?? []) add(u);

    if (!DRY_RUN && nextImages.length) {
      await ddb.send(
        new UpdateCommand({
          TableName: PRODUCTS_TABLE,
          Key: { PK: productKeys.pk(product.slug), SK: productKeys.sk() },
          UpdateExpression: "SET images = :imgs, updatedAt = :u",
          ExpressionAttributeValues: {
            ":imgs": nextImages,
            ":u": new Date().toISOString(),
          },
        })
      );
    }

    report.push({
      sku: product.sku,
      before,
      after: nextImages.length,
      files: nextImages.map((u) => basename(u)),
    });
    console.log(
      `• ${product.sku}: ${before} → ${nextImages.length}  [${nextImages.map((u) => basename(u)).join(", ")}]`
    );
  }

  const out = join(ROOT, "scripts/data/inventory-2-image-fix-report.json");
  writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), report }, null, 2) + "\n");
  console.log(`\nWrote ${out}`);
  console.log(DRY_RUN ? "DRY RUN — no S3/Dynamo writes" : "Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
