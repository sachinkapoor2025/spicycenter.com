import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { ok, badRequest, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";
import { IMAGE_CACHE_CONTROL, allVariantObjectKeys } from "@spicycorner/shared";

const BUCKET = process.env.UPLOAD_BUCKET;
const CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getS3(): S3Client | null {
  if (!BUCKET || process.env.USE_LOCAL_UPLOADS === "true") return null;
  return new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
}

function publicUrl(key: string): string {
  if (CDN_DOMAIN) return `https://${CDN_DOMAIN}/${key}`;
  if (process.env.USE_LOCAL_UPLOADS === "true") {
    const base = process.env.LOCAL_API_URL ?? "http://localhost:3001";
    return `${base}/uploads/${key}`;
  }
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

function keyFromPublicUrl(imageUrl: string): string | null {
  try {
    const parsed = new URL(imageUrl);
    const hostname = parsed.hostname.toLowerCase();
    const cdnHost = CDN_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    const s3Host = BUCKET ? `${BUCKET}.s3.amazonaws.com`.toLowerCase() : "";
    const localApi = process.env.LOCAL_API_URL ?? "http://localhost:3001";
    const localHost = new URL(localApi).host.toLowerCase();

    if (cdnHost && hostname === cdnHost) return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (s3Host && hostname === s3Host) return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (process.env.USE_LOCAL_UPLOADS === "true" && parsed.host.toLowerCase() === localHost) {
      const match = parsed.pathname.match(/^\/uploads\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    }
  } catch {
    return null;
  }
  return null;
}

async function deleteStoredImage(imageUrl: string): Promise<boolean> {
  const key = keyFromPublicUrl(imageUrl);
  if (!key) return false;

  if (process.env.USE_LOCAL_UPLOADS === "true") {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  }

  const s3 = getS3();
  if (!s3 || !BUCKET) return false;
  const keys = [key, ...allVariantObjectKeys(key)];
  await Promise.all(
    keys.map((k) => s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: k })))
  );
  return true;
}

export async function getUploadUrl(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const filename = body.filename as string;
  const contentType = (body.contentType as string) ?? "image/jpeg";
  const productSlug = (body.productSlug as string | undefined)?.trim();
  const folder = (body.folder as string | undefined)?.trim();

  if (!filename) return badRequest("filename required");
  const normalizedType = contentType.toLowerCase();
  if (!ALLOWED_UPLOAD_TYPES.has(normalizedType)) {
    return badRequest("Only JPEG, PNG, WebP, or GIF uploads are allowed");
  }

  const ext = path.extname(filename) || ".jpg";
  const prefix =
    folder === "blog"
      ? "blog"
      : folder === "expenses"
        ? "expenses"
        : productSlug
          ? `products/${productSlug}`
          : "products";
  const key = `${prefix}/${uuidv4()}${ext}`;

  const s3 = getS3();
  if (!s3) {
    return ok({
      mode: "local",
      key,
      uploadUrl: `${process.env.LOCAL_API_URL ?? "http://localhost:3001"}/uploads/direct/${key}`,
      publicUrl: publicUrl(key),
    });
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: IMAGE_CACHE_CONTROL,
    ...(productSlug ? { Metadata: { "product-slug": productSlug } } : {}),
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return ok({ mode: "s3", key, uploadUrl, publicUrl: publicUrl(key) });
}

async function recordUploadRegistry(slug: string, imageUrl: string, storageKey: string | null) {
  if (!storageKey) return;
  const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
  const { docClient, CONFIG_TABLE, now } = await import("../lib/db");
  const { uploadRegistryKeys } = await import("@spicycorner/shared");
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: uploadRegistryKeys.pk(storageKey),
        SK: uploadRegistryKeys.sk(),
        productSlug: slug,
        imageUrl,
        storageKey,
        createdAt: now(),
      },
    })
  );
}

export async function attachImageToProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const body = JSON.parse(event.body ?? "{}");
  const imageUrl = body.imageUrl as string;
  if (!imageUrl) return badRequest("imageUrl required");

  const { GetCommand, PutCommand } = await import("@aws-sdk/lib-dynamodb");
  const { docClient, PRODUCTS_TABLE, now } = await import("../lib/db");
  const { productKeys, mergeProductImages } = await import("@spicycorner/shared");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return badRequest("Product not found");

  const currentImages = (existing.Item.images as string[]) ?? [];
  const images = mergeProductImages(currentImages, [imageUrl]);
  const updated = { ...existing.Item, images, updatedAt: now() };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));
  await recordUploadRegistry(slug, imageUrl, keyFromPublicUrl(imageUrl));
  const { withResolvedProductImages } = await import("../lib/images");
  return ok({ product: withResolvedProductImages(updated) });
}

export async function deleteImageFromProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const body = JSON.parse(event.body ?? "{}");
  const imageUrl = body.imageUrl as string;
  if (!imageUrl) return badRequest("imageUrl required");

  const { GetCommand, PutCommand } = await import("@aws-sdk/lib-dynamodb");
  const { docClient, PRODUCTS_TABLE, now } = await import("../lib/db");
  const { productKeys } = await import("@spicycorner/shared");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return badRequest("Product not found");

  const currentImages = (existing.Item.images as string[]) ?? [];
  if (!currentImages.includes(imageUrl)) return badRequest("Image not found on product");

  const images = currentImages.filter((image) => image !== imageUrl);
  const updated = { ...existing.Item, images, updatedAt: now() };
  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));

  let storageDeleted = false;
  try {
    storageDeleted = await deleteStoredImage(imageUrl);
  } catch {
    storageDeleted = false;
  }

  return ok({ product: updated, deleted: true, storageDeleted });
}

/** Local dev: save uploaded file to disk */
export function saveLocalUpload(key: string, data: Buffer): string {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
  fs.writeFileSync(filePath, data);
  return publicUrl(key);
}

export function readLocalUpload(key: string): Buffer | null {
  const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function getContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] ?? "application/octet-stream";
}
