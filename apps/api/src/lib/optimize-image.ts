import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  IMAGE_CACHE_CONTROL,
  IMAGE_PROCESS_MAX_BYTES,
  IMAGE_VARIANT_PRESETS,
  IMAGE_VARIANT_NAMES,
  isOptimizableImageKey,
  variantObjectKey,
  type ImageVariantName,
} from "@spicycorner/shared";

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  followRegionRedirects: true,
});

function decodeS3Key(key: string): string {
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
}

export async function optimizeObject(bucket: string, rawKey: string): Promise<{ skipped?: string; variants?: number }> {
  const key = decodeS3Key(rawKey);
  if (!bucket || !key) return { skipped: "missing-key" };
  if (!isOptimizableImageKey(key)) return { skipped: "not-optimizable" };

  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const size = obj.ContentLength ?? 0;
  if (size > IMAGE_PROCESS_MAX_BYTES) {
    console.warn("[image-optimize] skip oversized object", { key, size });
    return { skipped: "too-large" };
  }

  const body = obj.Body;
  if (!body) return { skipped: "empty" };
  const bytes = Buffer.from(await body.transformToByteArray());
  const base = sharp(bytes, { failOn: "none", animated: false, limitInputPixels: 40_000_000 });
  const meta = await base.metadata();
  if (!meta.width || !meta.height) return { skipped: "no-dimensions" };

  let written = 0;
  for (const name of IMAGE_VARIANT_NAMES) {
    const preset = IMAGE_VARIANT_PRESETS[name as ImageVariantName];
    const outKey = variantObjectKey(key, name);
    const buf = await base
      .clone()
      .rotate()
      .resize({
        width: preset.width,
        height: preset.width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: preset.quality, effort: 4 })
      .toBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: outKey,
        Body: buf,
        ContentType: "image/webp",
        CacheControl: IMAGE_CACHE_CONTROL,
      })
    );
    written += 1;
  }

  console.info("[image-optimize] wrote variants", { key, variants: written, srcBytes: size });
  return { variants: written };
}
