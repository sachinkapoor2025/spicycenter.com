"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

export interface HomeBanner {
  src: string;
  alt: string;
  href?: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  description: string;
  cta: string;
  pill: string;
}

const TRUST_FEATURES = [
  {
    label: "spice products",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 12v8H4v-8M12 3v9m0 0L8.5 8.5M12 12l3.5-3.5M6 21h12a2 2 0 002-2v-6H4v6a2 2 0 002 2z"
      />
    ),
  },
  {
    label: "Delivering in 5–7 days",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0m-4 0V9m0 0H5.5M12 9h6.5M12 9L9 5m3 4l3-4"
      />
    ),
  },
  {
    label: "Secure Shopping",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
  },
  {
    label: "Made with Love",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    ),
  },
] as const;

function Eyebrow({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
      <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-nav/60" aria-hidden />
      <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-primary/80 uppercase text-center lg:text-left">
        {text}
      </p>
      <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-nav/60" aria-hidden />
    </div>
  );
}

export function BannerCarousel({ banners }: { banners: readonly HomeBanner[] }) {
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
    const timer = setInterval(() => goTo(index + 1), 6000);
    return () => clearInterval(timer);
  }, [banners.length, paused, index, goTo]);

  const banner = banners[index];
  if (!banner) return null;

  return (
    <section
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Featured promotions"
    >
      <div className="relative overflow-hidden bg-white border-b border-slate-100">
        <div className="relative max-w-7xl mx-auto lg:grid lg:grid-cols-[2fr_3fr] lg:gap-6 lg:items-center lg:px-4 lg:py-4">
          {/* Banner image — 903×489 assets; object-contain keeps headline/footer text visible */}
          <div className="order-1 lg:order-2 relative w-full min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {banners.length > 1 && (
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  className="hidden sm:flex shrink-0 h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-md border border-blue-100 hover:bg-nav hover:text-white transition"
                  aria-label="Previous slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              <div className="relative flex-1 min-w-0 aspect-[903/489] rounded-lg overflow-hidden bg-[#1a0a12]">
                {banners.map((b, i) => (
                  <div
                    key={b.src}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                      i === index ? "opacity-100 z-10" : "opacity-0 z-0"
                    }`}
                    aria-hidden={i !== index}
                  >
                    {b.href ? (
                      <Link href={b.href} className="block h-full w-full" tabIndex={i === index ? 0 : -1}>
                        <Image
                          src={b.src}
                          alt={b.alt}
                          fill
                          className="object-contain object-center"
                          sizes="(max-width: 1024px) 100vw, 55vw"
                          priority={i === 0}
                        />
                      </Link>
                    ) : (
                      <Image
                        src={b.src}
                        alt={b.alt}
                        fill
                        className="object-contain object-center"
                        sizes="(max-width: 1024px) 100vw, 55vw"
                        priority={i === 0}
                      />
                    )}
                  </div>
                ))}
              </div>

              {banners.length > 1 && (
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  className="hidden sm:flex shrink-0 h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-md border border-blue-100 hover:bg-nav hover:text-white transition"
                  aria-label="Next slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {banners.length > 1 && (
              <div className="flex sm:hidden justify-center gap-4 mt-3">
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-md border border-blue-100 hover:bg-nav hover:text-white transition"
                  aria-label="Previous slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-md border border-blue-100 hover:bg-nav hover:text-white transition"
                  aria-label="Next slide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="order-2 lg:order-1 text-center lg:text-left z-10 px-4 py-6 sm:py-8 lg:py-0 lg:pl-2 lg:pr-4">
            <div key={banner.src} className="hero-slide-in">
              <Eyebrow text={banner.eyebrow} />

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] leading-tight text-primary mb-4">
                {banner.title}{" "}
                <span className="text-nav italic">{banner.titleAccent}</span>
              </h1>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
                {banner.description}
              </p>

              {banner.href && (
                <Link
                  href={banner.href}
                  className="inline-flex items-center justify-center rounded-full bg-nav text-white font-semibold text-sm px-7 py-3 hover:bg-primary transition shadow-md shadow-nav/25"
                >
                  {banner.cta}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}

              <ul className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 max-w-lg mx-auto lg:mx-0">
                {TRUST_FEATURES.map((f) => (
                  <li key={f.label} className="flex flex-col items-center lg:items-start gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white border border-blue-100 text-nav shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        {f.icon}
                      </svg>
                    </span>
                    <span className="text-[11px] font-semibold text-primary/90 leading-tight text-center lg:text-left">
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile trust icons */}
        <ul className="sm:hidden grid grid-cols-4 gap-2 px-4 pb-4">
          {TRUST_FEATURES.map((f) => (
            <li key={f.label} className="flex flex-col items-center gap-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-blue-100 text-nav">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  {f.icon}
                </svg>
              </span>
              <span className="text-[9px] font-semibold text-primary/80 text-center leading-tight">{f.label}</span>
            </li>
          ))}
        </ul>

        {/* Bottom pill strip */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-100/80 via-sky-50 to-blue-100/80 border border-blue-100 px-4 sm:px-6 py-3 text-center">
            <svg className="w-4 h-4 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p className="text-xs sm:text-sm text-primary font-medium leading-snug">
              {banner.pill.split("·").map((part, i, arr) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {i === arr.length - 1 ? (
                    <span className="text-nav font-semibold">{part.trim()}</span>
                  ) : (
                    part.trim()
                  )}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Pagination pills */}
      {banners.length > 1 && (
        <div className="flex justify-center items-center gap-2 py-3 bg-white" role="tablist" aria-label="Banner slides">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-8 bg-nav" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
