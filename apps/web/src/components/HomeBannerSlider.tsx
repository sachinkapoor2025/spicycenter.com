"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type HomeBannerSlide = {
  src: string;
  alt: string;
  href: string;
};

export function HomeBannerSlider({ banners }: { banners: readonly HomeBannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      if (banners.length === 0) return;
      setIndex(((next % banners.length) + banners.length) % banners.length);
    },
    [banners.length]
  );

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const timer = setInterval(() => goTo(index + 1), 6500);
    return () => clearInterval(timer);
  }, [banners.length, paused, index, goTo]);

  if (banners.length === 0) return null;

  return (
    <section
      className="bg-[#f7f1e8] border-b border-[#eadfce]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Homepage banners"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        <div className="relative">
          {/* Keep the ChatGPT banner ratio (1024×384 = 8/3) — not a tall full-page hero */}
          <div className="relative w-full overflow-hidden rounded-xl bg-[#1f140c] shadow-card aspect-[8/3]">
            {banners.map((b, i) => (
              <Link
                key={b.src}
                href={b.href}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
                tabIndex={i === index ? 0 : -1}
                aria-hidden={i !== index}
              >
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  className="object-contain object-center"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  priority={i === 0}
                />
              </Link>
            ))}
          </div>

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary shadow hover:bg-nav hover:text-white"
                aria-label="Previous banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary shadow hover:bg-nav hover:text-white"
                aria-label="Next banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Banner slides">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Banner ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-nav" : "w-2 bg-[#dcc9a8]"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
