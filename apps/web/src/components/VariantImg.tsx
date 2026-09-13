"use client";

import { productImageVariantUrl, type ImageVariantName } from "@spicycorner/shared";
import { resolveImageUrl } from "@/lib/images";
import { useCallback, useEffect, useState, type Ref } from "react";

type VariantImgProps = {
  src: string;
  variant: ImageVariantName;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  ariaHidden?: boolean;
  draggable?: boolean;
  imgRef?: Ref<HTMLImageElement>;
  onLoad?: () => void;
};

/** <img> that prefers a sized WebP sibling and falls back to the original URL. */
export function VariantImg({
  src,
  variant,
  alt,
  className,
  width,
  height,
  loading = "lazy",
  ariaHidden,
  draggable = false,
  imgRef,
  onLoad,
}: VariantImgProps) {
  const original = resolveImageUrl(src);
  const preferred = productImageVariantUrl(original, variant);
  const [current, setCurrent] = useState(preferred);

  useEffect(() => {
    setCurrent(preferred);
  }, [preferred]);

  const handleError = useCallback(() => {
    if (current !== original) setCurrent(original);
  }, [current, original]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={current}
      alt={alt}
      aria-hidden={ariaHidden}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      draggable={draggable}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}
