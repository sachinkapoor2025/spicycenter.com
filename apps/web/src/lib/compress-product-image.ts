/** Client-side product/blog image compression before S3 upload. */

import {
  IMAGE_MASTER_MAX_EDGE_PX,
  IMAGE_MASTER_TARGET_BYTES,
  IMAGE_UPLOAD_MAX_BYTES,
} from "@spicycorner/shared";

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function supportsWebp(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      mime,
      quality
    );
  });
}

/**
 * Downscale and recompress product photos so CloudFront never serves 5–10MB PNG masters.
 * Lambda still writes thumb/card/gallery/zoom WebP siblings after upload.
 */
export async function compressProductImage(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error("Please choose a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES && file.size > 40 * 1024 * 1024) {
    throw new Error("Image is too large to process in the browser (max 8MB after compression)");
  }

  const img = await loadImage(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const scale = Math.min(1, IMAGE_MASTER_MAX_EDGE_PX / Math.max(width, height, 1));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const webp = supportsWebp();
  const mime = webp ? "image/webp" : "image/jpeg";
  const ext = webp ? "webp" : "jpg";
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, mime, quality);
  while (blob.size > IMAGE_MASTER_TARGET_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, mime, quality);
  }

  if (file.size <= IMAGE_MASTER_TARGET_BYTES && blob.size >= file.size && scale === 1) {
    return file;
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
}
