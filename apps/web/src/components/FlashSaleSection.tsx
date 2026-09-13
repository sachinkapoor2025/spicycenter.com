"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@spicycorner/shared";
import {
  FLASH_COMBO_SALE,
  flashComboSaleEndsAt,
  isFlashComboSaleActive,
} from "@spicycorner/shared";
import { AddToCartControl } from "@/components/AddToCartControl";
import { ProductImageRotator } from "@/components/ProductImageRotator";
import { useCurrency } from "@/lib/currency-context";

type Remaining = { h: string; m: string; s: string };

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

function remainingUntil(endsAt: Date, now: Date): Remaining | null {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h: pad(h), m: pad(m), s: pad(s) };
}

function TimerBlock({
  value,
  label,
  compact = false,
}: {
  value: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center ${
        compact ? "min-w-[3.1rem]" : "min-w-[4.25rem] sm:min-w-[5rem]"
      }`}
    >
      <div
        className={`w-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#244f88] to-primary shadow-[0_10px_28px_rgba(24,58,104,0.4)] ring-1 ring-white/20 ${
          compact ? "px-2 py-2" : "px-3 py-3 sm:py-3.5"
        }`}
      >
        <span
          className={`block text-center font-mono font-bold tabular-nums text-white leading-none tracking-wider ${
            compact ? "text-xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {value}
        </span>
      </div>
      <span
        className={`mt-1.5 font-bold uppercase tracking-[0.18em] text-white/90 drop-shadow ${
          compact ? "text-[9px]" : "text-[11px] sm:text-xs text-primary/80 drop-shadow-none"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function OfferTimer({
  remaining,
  variant,
}: {
  remaining: Remaining;
  variant: "overlay" | "panel";
}) {
  const compact = variant === "overlay";
  return (
    <div
      className={
        variant === "overlay"
          ? "rounded-xl bg-black/55 backdrop-blur-sm px-3 py-2.5 border border-white/20"
          : "rounded-2xl border border-rose-200 bg-white/90 px-4 py-4 sm:px-6 sm:py-5 shadow-md w-full max-w-xl"
      }
    >
      <p
        className={`font-bold uppercase tracking-[0.2em] mb-2 ${
          compact
            ? "text-[10px] text-white text-center"
            : "text-[11px] text-accent text-center sm:text-left mb-3"
        }`}
      >
        Offer ends in
      </p>
      <div
        className={`flex items-end gap-2 ${
          compact ? "justify-center" : "justify-center sm:justify-start sm:gap-3"
        }`}
      >
        <TimerBlock value={remaining.h} label="Hrs" compact={compact} />
        <span
          className={`font-bold ${
            compact ? "pb-5 text-lg text-white/80" : "pb-7 text-2xl text-accent/60"
          }`}
        >
          :
        </span>
        <TimerBlock value={remaining.m} label="Min" compact={compact} />
        <span
          className={`font-bold ${
            compact ? "pb-5 text-lg text-white/80" : "pb-7 text-2xl text-accent/60"
          }`}
        >
          :
        </span>
        <TimerBlock value={remaining.s} label="Sec" compact={compact} />
      </div>
    </div>
  );
}

export function FlashSaleSection({ product }: { product: Product | null }) {
  const { format } = useCurrency();
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setActive(isFlashComboSaleActive(now));
      setRemaining(remainingUntil(flashComboSaleEndsAt(), now));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!product || !active || !remaining) return null;

  const gallery =
    product.images?.length ? product.images : [...FLASH_COMBO_SALE.images];
  const shippingLabel = format(FLASH_COMBO_SALE.shippingUsd, "USD");

  return (
    <section className="relative overflow-hidden border-y border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #e11d48 0, transparent 40%), radial-gradient(circle at 80% 0%, #d97706 0, transparent 35%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-10">
        {/* Mobile: heading → image+timer → details. Desktop: image | details (unchanged). */}
        <div className="grid lg:grid-cols-[minmax(280px,420px)_1fr] gap-5 lg:gap-10 items-center">
          {/* Mobile-only headline above image */}
          <div className="lg:hidden text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-accent mb-1.5">
              {FLASH_COMBO_SALE.title}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-primary leading-tight">
              {FLASH_COMBO_SALE.headline}
            </h2>
          </div>

          {/* Image card — timer overlays on mobile only */}
          <div className="w-full max-w-md mx-auto lg:mx-0 order-none">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
                  <ProductImageRotator
                    images={gallery}
                    alt={product.name}
                    staggerKey={product.slug}
                    priority
                    className="absolute inset-0 h-full w-full"
                  />
                </Link>
                <span className="absolute top-3 left-3 z-10 bg-accent text-white text-xs font-bold px-2.5 py-1 rounded lg:inline-block">
                  {FLASH_COMBO_SALE.title}
                </span>
                {/* Timer on image — mobile only */}
                <div className="absolute inset-x-3 bottom-3 z-10 lg:hidden pointer-events-none">
                  <OfferTimer remaining={remaining} variant="overlay" />
                </div>
              </div>
              <Link href={`/products/${product.slug}`} className="block px-3 py-3 lg:block">
                <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 hover:text-nav">
                  {product.name}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-nav font-bold">
                    {format(product.price, product.currency)}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="text-xs text-slate-400 line-through">
                      {format(product.compareAtPrice, product.currency)}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>

          {/* Right column / below-image details */}
          <div className="flex flex-col justify-center min-w-0">
            {/* Desktop headline (hidden on mobile — already shown above) */}
            <div className="hidden lg:block">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-accent mb-2">
                {FLASH_COMBO_SALE.title}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-primary leading-tight mb-3">
                {FLASH_COMBO_SALE.headline}
              </h2>
            </div>

            <p className="text-slate-600 text-sm sm:text-base mb-4 max-w-xl">
              Limited-time spice flash offer. No coupon codes on this offer.
            </p>

            <ul className="text-sm text-slate-700 space-y-1.5 mb-5 columns-1 sm:columns-2 gap-x-8 max-w-xl">
              {FLASH_COMBO_SALE.includes.map((line) => (
                <li key={line} className="flex gap-2 break-inside-avoid mb-1.5">
                  <span className="text-accent font-bold">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Flash price</p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold text-accent">
                  {format(product.price, product.currency)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-slate-400 line-through text-lg">
                    {format(product.compareAtPrice, product.currency)}
                  </span>
                )}
                <span className="text-sm font-semibold text-primary">
                  + {shippingLabel} shipping
                </span>
              </div>
            </div>

            {/* Desktop timer panel — mobile uses overlay on image */}
            <div className="hidden lg:block mb-5">
              <OfferTimer remaining={remaining} variant="panel" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[200px] w-full sm:w-auto">
                <AddToCartControl
                  productSlug={product.slug}
                  disabled={product.inventory <= 0}
                  variant="detail"
                />
              </div>
              <Link
                href={`/products/${product.slug}`}
                className="text-sm font-semibold text-nav hover:underline"
              >
                View combo details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
