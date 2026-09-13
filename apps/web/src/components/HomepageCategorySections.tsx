"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  HOMEPAGE_CATEGORY_PREVIEW_LIMIT,
  cjStorefrontProductsPath,
  type Product,
} from "@spicycorner/shared";
import { TrackedProductCard } from "@/components/TrackedProductCard";
import { api } from "@/lib/api";

type CategoryPreview = { slug: string; name: string };

function LazyCategoryRow({
  slug,
  name,
  contained = false,
  eager = false,
  initialProducts = [],
}: CategoryPreview & { contained?: boolean; eager?: boolean; initialProducts?: Product[] }) {
  const ref = useRef<HTMLElement>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [requested, setRequested] = useState(eager || initialProducts.length > 0);
  const [empty, setEmpty] = useState(false);
  const sectionClass = contained ? "py-8" : "max-w-7xl mx-auto px-4 py-8";

  useEffect(() => {
    const node = ref.current;
    if (!node || requested) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setRequested(true);
        observer.disconnect();
      },
      { rootMargin: "280px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [requested]);

  useEffect(() => {
    if (!requested || initialProducts.length > 0) return;
    let cancelled = false;
    void api<{ products: Product[] }>(
      cjStorefrontProductsPath({ category: slug, limit: HOMEPAGE_CATEGORY_PREVIEW_LIMIT })
    )
      .then((data) => {
        if (cancelled) return;
        const next = (data.products ?? []).slice(0, HOMEPAGE_CATEGORY_PREVIEW_LIMIT);
        setProducts(next);
        if (next.length === 0) setEmpty(true);
      })
      .catch(() => {
        if (!cancelled) setEmpty(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requested, slug, initialProducts.length]);

  if (empty) return null;
  if (!requested) {
    return <section ref={ref} className={`${sectionClass} min-h-[6rem]`} aria-hidden />;
  }

  return (
    <section ref={ref} className={`${sectionClass}${contained ? "" : " section-divider"}`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="spice-heading text-xl md:text-2xl capitalize">{name}</h2>
        <Link href={`/categories/${slug}`} className="text-nav font-semibold text-sm hover:underline">
          View All →
        </Link>
      </div>
      {products.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
          {products.map((p, i) => (
            <TrackedProductCard
              key={p.slug}
              product={p}
              position={i + 1}
              listingPage={`category:${slug}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomepageCategorySections({
  categories,
  contained = false,
  eagerCount = 0,
  initialBySlug,
}: {
  categories: CategoryPreview[];
  contained?: boolean;
  eagerCount?: number;
  initialBySlug?: Record<string, Product[]>;
}) {
  if (categories.length === 0) return null;
  return (
    <>
      {categories.map((category, index) => (
        <LazyCategoryRow
          key={category.slug}
          slug={category.slug}
          name={category.name}
          contained={contained}
          eager={index < eagerCount}
          initialProducts={initialBySlug?.[category.slug] ?? []}
        />
      ))}
    </>
  );
}
