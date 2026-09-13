"use client";

import { useEffect, useMemo, useState } from "react";
import { productImageVariantUrl, selectDisplayableProductImages, type SizedProductImage } from "@spicycorner/shared";
import { resolveImageUrl } from "@/lib/images";
import { VariantImg } from "@/components/VariantImg";

const ROTATE_MS = 4000;

/**
 * Auto-rotates through a product's gallery images on listing cards.
 * Probes tiny thumbnails only (not full originals) so CloudFront bytes stay small.
 * Renders the visible card + next card — never the whole gallery at once.
 */
export function ProductImageRotator({
  images,
  alt,
  className = "",
  staggerKey = "",
  priority = false,
}: {
  images: string[];
  alt: string;
  className?: string;
  staggerKey?: string;
  priority?: boolean;
}) {
  const resolved = useMemo(
    () => [...new Set(images.map(resolveImageUrl).filter(Boolean))],
    [images]
  );
  const [urls, setUrls] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(priority);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setUrls([]);
    setIndex(0);
    if (resolved.length === 0 || (!visible && !priority)) return;

    let cancelled = false;
    const measured: SizedProductImage[] = [];
    let remaining = resolved.length;

    const finish = () => {
      if (cancelled) return;
      const picked = selectDisplayableProductImages(measured);
      setUrls(picked.length > 0 ? picked : resolved.slice(0, 1));
    };

    resolved.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        measured.push({ url, width: img.naturalWidth, height: img.naturalHeight });
        remaining -= 1;
        if (remaining === 0) finish();
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0) finish();
      };
      img.src = productImageVariantUrl(url, "thumb");
    });

    return () => {
      cancelled = true;
    };
  }, [resolved, visible, priority]);

  useEffect(() => {
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "80px", threshold: 0.15 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    setIndex(0);
  }, [urls]);

  useEffect(() => {
    if (urls.length <= 1 || paused || !visible) return;

    let hash = 0;
    for (let i = 0; i < staggerKey.length; i++) hash = (hash + staggerKey.charCodeAt(i) * (i + 1)) % 900;
    const delay = ROTATE_MS + hash;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, delay);
    return () => window.clearInterval(id);
  }, [urls, paused, visible, staggerKey]);

  if (resolved.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-slate-400 text-sm ${className}`}>
        No image
      </div>
    );
  }

  const display = urls.length > 0 ? urls : resolved.slice(0, 1);
  const visibleIdx = new Set<number>();
  if (display.length > 0) visibleIdx.add(index);
  if (display.length > 1) visibleIdx.add((index + 1) % display.length);

  return (
    <div
      ref={setRoot}
      className={`relative overflow-hidden bg-slate-50 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {display.map((src, i) =>
        visibleIdx.has(i) ? (
          <VariantImg
            key={`${src}-${i}`}
            src={src}
            variant="card"
            alt={i === 0 ? alt : ""}
            ariaHidden={i !== index}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ease-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            loading={priority && i === 0 ? "eager" : "lazy"}
            width={640}
            height={640}
          />
        ) : null
      )}
      {display.length > 1 && (
        <div className="absolute bottom-2 left-1/2 z-[1] flex -translate-x-1/2 gap-1" aria-hidden>
          {display.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
