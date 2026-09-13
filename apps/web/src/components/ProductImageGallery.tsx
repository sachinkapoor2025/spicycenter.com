"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveImageUrls } from "@/lib/images";
import {
  productImageVariantUrl,
  selectDisplayableProductImages,
  type SizedProductImage,
} from "@spicycorner/shared";
import { VariantImg } from "@/components/VariantImg";

interface ProductImageGalleryProps {
  images: string[];
  videos?: Array<{ url: string; posterUrl?: string; durationSec?: number }>;
  alt: string;
}

const ZOOM_LEVEL = 2.5;
const LENS_RATIO = 0.38;
const ZOOM_PANEL_SIZE = 160;

type ImageBounds = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

type LensState = {
  left: number;
  top: number;
  width: number;
  height: number;
  bgX: number;
  bgY: number;
};

function getObjectContainBounds(cw: number, ch: number, nw: number, nh: number): ImageBounds | null {
  if (!nw || !nh || !cw || !ch) return null;
  const scale = Math.min(cw / nw, ch / nh);
  const width = nw * scale;
  const height = nh * scale;
  return {
    offsetX: (cw - width) / 2,
    offsetY: (ch - height) / 2,
    width,
    height,
  };
}

function useDesktopHoverZoom() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

type GalleryMedia =
  | { type: "video"; url: string; posterUrl?: string }
  | { type: "image"; url: string };

export function ProductImageGallery({ images, videos = [], alt }: ProductImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [lens, setLens] = useState<LensState | null>(null);
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);
  const [displayImgs, setDisplayImgs] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDesktop = useDesktopHoverZoom();

  const videoItems: GalleryMedia[] = useMemo(
    () =>
      videos
        .filter((v) => /^https?:\/\//i.test(v.url))
        .map((v) => ({ type: "video" as const, url: v.url, posterUrl: v.posterUrl })),
    [videos]
  );
  const resolved = useMemo(() => resolveImageUrls(images), [images]);
  // Show the full list immediately so multi-image PDPs never look like a single photo
  // while size filtering runs (or if remote probes fail).
  const imageUrls = displayImgs.length > 0 ? displayImgs : resolved;
  const media: GalleryMedia[] = useMemo(
    () => [...imageUrls.map((url) => ({ type: "image" as const, url })), ...videoItems],
    [videoItems, imageUrls]
  );
  const imgs = imageUrls;
  const current = media[selected];
  const currentImage = current?.type === "image" ? current.url : "";

  useEffect(() => {
    setDisplayImgs([]);
    setSelected(0);
    if (resolved.length === 0) return;

    let cancelled = false;
    const measured: SizedProductImage[] = [];
    let remaining = resolved.length;

    const finish = () => {
      if (cancelled) return;
      const picked = selectDisplayableProductImages(measured);
      setDisplayImgs(picked.length > 0 ? picked : resolved.slice(0, 1));
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
  }, [resolved]);

  const updateBounds = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return null;
    return getObjectContainBounds(container.clientWidth, container.clientHeight, img.naturalWidth, img.naturalHeight);
  }, []);

  const clearZoom = useCallback(() => {
    setIsHovering(false);
    setLens(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktop) return;

      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img?.naturalWidth) return;

      const bounds = updateBounds();
      if (!bounds) return;
      setImageBounds(bounds);

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const relX = x - bounds.offsetX;
      const relY = y - bounds.offsetY;

      if (relX < 0 || relY < 0 || relX > bounds.width || relY > bounds.height) {
        setLens(null);
        return;
      }

      const lensW = bounds.width * LENS_RATIO;
      const lensH = bounds.height * LENS_RATIO;

      let left = x - lensW / 2;
      let top = y - lensH / 2;
      left = Math.max(bounds.offsetX, Math.min(left, bounds.offsetX + bounds.width - lensW));
      top = Math.max(bounds.offsetY, Math.min(top, bounds.offsetY + bounds.height - lensH));

      const relCenterX = left - bounds.offsetX + lensW / 2;
      const relCenterY = top - bounds.offsetY + lensH / 2;

      setLens({
        left,
        top,
        width: lensW,
        height: lensH,
        bgX: -(relCenterX * ZOOM_LEVEL - ZOOM_PANEL_SIZE / 2),
        bgY: -(relCenterY * ZOOM_LEVEL - ZOOM_PANEL_SIZE / 2),
      });
    },
    [isDesktop, updateBounds]
  );

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelected((i) => (i <= 0 ? media.length - 1 : i - 1));
    },
    [media.length]
  );

  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelected((i) => (i >= media.length - 1 ? 0 : i + 1));
    },
    [media.length]
  );

  useEffect(() => {
    if (!isDesktop) clearZoom();
  }, [isDesktop, clearZoom]);

  useEffect(() => {
    clearZoom();
    setImageBounds(null);
  }, [current, clearZoom]);

  useEffect(() => {
    setSelected((i) => (media.length === 0 ? 0 : Math.min(i, media.length - 1)));
  }, [media.length]);

  useEffect(() => {
    if (current?.type === "video") setLightbox(false);
  }, [current]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, goNext, goPrev]);

  if (!current) {
    return (
      <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
        No image
      </div>
    );
  }

  const isVideo = current.type === "video";
  const showZoom = !isVideo && isDesktop && isHovering && lens && imageBounds;
  const videoCount = videoItems.length;
  const imageCount = imgs.length;

  return (
    <>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className={`relative aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 group ${
            isVideo ? "cursor-default" : "cursor-zoom-in md:cursor-crosshair"
          }`}
          onClick={() => {
            if (!isVideo) setLightbox(true);
          }}
          onMouseEnter={() => !isVideo && isDesktop && setIsHovering(true)}
          onMouseLeave={clearZoom}
          onMouseMove={isVideo ? undefined : handleMouseMove}
          role={isVideo ? undefined : "button"}
          tabIndex={isVideo ? undefined : 0}
          onKeyDown={(e) => !isVideo && e.key === "Enter" && setLightbox(true)}
          aria-label={isVideo ? undefined : "Open image zoom"}
        >
          {isVideo ? (
            <video
              key={current.url}
              className="w-full h-full object-contain bg-black"
              src={current.url}
              poster={current.posterUrl}
              controls
              playsInline
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <VariantImg
              imgRef={imgRef}
              src={currentImage}
              variant="gallery"
              alt={`${alt} — image ${selected + 1} of ${media.length}`}
              onLoad={() => setImageBounds(updateBounds())}
              className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02] md:group-hover:scale-100 select-none"
            />
          )}

          {showZoom && (
            <>
              <div
                className="absolute z-[2] border-2 border-dashed border-nav bg-nav/5 pointer-events-none hidden md:block"
                style={{
                  left: lens.left,
                  top: lens.top,
                  width: lens.width,
                  height: lens.height,
                }}
                aria-hidden
              />
              <div
                className="absolute bottom-3 right-3 z-[3] hidden md:block rounded-lg border-2 border-slate-200 bg-white shadow-lg overflow-hidden pointer-events-none"
                style={{
                  width: ZOOM_PANEL_SIZE,
                  height: ZOOM_PANEL_SIZE,
                  backgroundImage: `url(${productImageVariantUrl(currentImage, "gallery")})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${imageBounds.width * ZOOM_LEVEL}px ${imageBounds.height * ZOOM_LEVEL}px`,
                  backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
                }}
                aria-hidden
              />
            </>
          )}

          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous media"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 shadow-md text-primary font-bold hover:bg-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-[4]"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next media"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 shadow-md text-primary font-bold hover:bg-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-[4]"
              >
                ›
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs bg-black/55 text-white px-2.5 py-1 rounded-full z-[4]">
                {selected + 1} / {media.length}
                {videoCount > 0 ? ` · ${videoCount} video${videoCount === 1 ? "" : "s"} · ${imageCount} photos` : ""}
              </span>
            </>
          )}

          {!isVideo && (
            <span className="absolute bottom-3 right-3 text-[11px] bg-white/90 text-slate-600 px-2 py-0.5 rounded shadow-sm md:hidden">
              Tap to zoom
            </span>
          )}
        </div>

        {media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {media.map((item, i) => (
              <button
                key={`${item.type}-${item.url}-${i}`}
                type="button"
                aria-label={item.type === "video" ? `Play video ${i + 1}` : `View image ${i + 1}`}
                aria-current={i === selected ? "true" : undefined}
                onClick={() => setSelected(i)}
                className={`relative shrink-0 w-[4.5rem] h-[4.5rem] rounded-lg overflow-hidden border-2 transition ${
                  i === selected ? "border-nav ring-2 ring-nav/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {item.type === "video" ? (
                  <>
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white text-[10px] font-semibold">
                      Video
                    </span>
                  </>
                ) : (
                  <VariantImg src={item.url} variant="thumb" alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && current.type === "image" && (
        <div
          className="fixed inset-0 z-[100] bg-black/92 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image zoom"
        >
          <button
            type="button"
            aria-label="Close zoom"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none z-10"
          >
            ×
          </button>

          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={goPrev}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white text-2xl hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={goNext}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white text-2xl hover:bg-white/25"
              >
                ›
              </button>
            </>
          )}

          <div onClick={(e) => e.stopPropagation()}>
            <VariantImg
              src={currentImage}
              variant="zoom"
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain"
              loading="eager"
            />
          </div>

          {media.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto max-w-full px-2">
              {media.map((item, i) => (
                <button
                  key={`lb-${item.url}-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(i);
                    if (item.type === "video") setLightbox(false);
                  }}
                  className={`shrink-0 w-14 h-14 rounded overflow-hidden border-2 ${
                    i === selected ? "border-white" : "border-white/30 opacity-70"
                  }`}
                >
                  {item.type === "video" ? (
                    <div className="w-full h-full bg-slate-700 text-white text-[10px] flex items-center justify-center">
                      Video
                    </div>
                  ) : (
                    <VariantImg src={item.url} variant="thumb" alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
