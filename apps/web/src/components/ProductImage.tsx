"use client";

import { type ImageVariantName } from "@spicycorner/shared";
import { resolveImageUrl } from "@/lib/images";
import { isPlaceholderProductImage } from "@/lib/product-images";
import { VariantImg } from "@/components/VariantImg";

type ProductImageProps = {
  src: string | undefined | null;
  alt: string;
  className?: string;
  variant?: ImageVariantName;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
};

/** Product thumbnail — never shows the missing-image placeholder graphic. */
export function ProductImage({
  src,
  alt,
  className = "",
  variant = "thumb",
  width,
  height,
  loading = "lazy",
}: ProductImageProps) {
  const initial = !isPlaceholderProductImage(src) ? resolveImageUrl(src) : "";

  if (!initial) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-slate-400 text-sm ${className}`}>
        No image
      </div>
    );
  }

  return (
    <VariantImg
      src={initial}
      variant={variant}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
    />
  );
}
