import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { IMAGE_CACHE_CONTROL, type Product } from "@spicycorner/shared";

const BUCKET = process.env.UPLOAD_BUCKET;
const CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const CJ_REFERER = "https://developers.cjdropshipping.com/";
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ALLOWED_HOSTS = [
  "download-only-api.cjdropshipping.com",
  "cf.cjdropshipping.com",
  "cjdropshipping.com",
  "oss.cjdropshipping.com",
  "aliyuncs.com",
];

function getS3(): S3Client | null {
  if (!BUCKET || process.env.USE_LOCAL_UPLOADS === "true") return null;
  return new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
}

function publicUrl(key: string): string {
  if (CDN_DOMAIN) return `https://${CDN_DOMAIN.replace(/^https?:\/\//, "")}/${key}`;
  if (BUCKET) return `https://${BUCKET}.s3.amazonaws.com/${key}`;
  return "";
}

function hostAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

async function downloadCjAsset(url: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!hostAllowed(url)) return null;
  const res = await fetch(url, {
    headers: { Referer: CJ_REFERER },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_VIDEO_BYTES) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_VIDEO_BYTES) return null;
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { bytes, contentType };
}

async function putPublicObject(key: string, bytes: Buffer, contentType: string): Promise<string | null> {
  const s3 = getS3();
  if (!s3 || !BUCKET) return null;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: IMAGE_CACHE_CONTROL,
    })
  );
  return publicUrl(key);
}

export type StoredProductVideo = NonNullable<Product["videos"]>[number];

export async function copyCjVideoToCdn(input: {
  pid: string;
  videoId?: string;
  videoUrl: string;
  posterUrl?: string;
  durationSec?: number;
}): Promise<StoredProductVideo | null> {
  const fallback: StoredProductVideo = {
    url: input.videoUrl,
    ...(input.posterUrl ? { posterUrl: input.posterUrl } : {}),
    ...(input.durationSec ? { durationSec: input.durationSec } : {}),
  };
  const video = await downloadCjAsset(input.videoUrl);
  if (!video) return fallback;
  const id = (input.videoId || "video").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "video";
  const pid = input.pid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "cj";
  const videoKey = `products/videos/${pid}/${id}.mp4`;
  const url = await putPublicObject(videoKey, video.bytes, video.contentType.includes("video") ? video.contentType : "video/mp4");
  if (!url) {
    // Local / no bucket: keep the CJ URL so the PDP gallery still has the file.
    return fallback;
  }

  let posterUrl = input.posterUrl;
  if (input.posterUrl) {
    const poster = await downloadCjAsset(input.posterUrl);
    if (poster) {
      const posterKey = `products/videos/${pid}/${id}.poster.jpg`;
      posterUrl = (await putPublicObject(posterKey, poster.bytes, poster.contentType || "image/jpeg")) ?? input.posterUrl;
    }
  }

  return {
    url,
    ...(posterUrl ? { posterUrl } : {}),
    ...(input.durationSec ? { durationSec: input.durationSec } : {}),
  };
}
