import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { Suspense } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryContentSection } from "@/components/CategoryContentSection";
import { CategoryProductLinks } from "@/components/CategoryProductLinks";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { JsonLd } from "@/components/JsonLd";
import { getCategoryContent } from "@/lib/content/category-content";
import { storefrontCountrySeoPages } from "@/lib/content/country-pages";
import { getCategoryPageSeo } from "@/lib/content/category-seo";
import { getCategoryRichContent } from "@/lib/content/category-rich-content";
import { seoLocations } from "@/lib/content/seo-data";
import { getCatalogCategory } from "@/lib/catalog-fallback";
import { resolveImageUrl } from "@/lib/images";
import { loadStorefrontListing } from "@/lib/product-loader";
import { categoryOrder } from "@/lib/site";
import { breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";
import {
  parseStorefrontListingSort,
  getInternalLinkGroups,
  type Product,
  type Category,
} from "@spicycorner/shared";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

/** Always fetch live product images — Amplify ISR was serving stale missing-image placeholders. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Pick 2–3 varied city pages from seoLocations based on category slug hash. */
function pickShipsToCities(categorySlug: string, count = 3) {
  const locs = seoLocations;
  if (locs.length === 0) return [];
  let hash = 0;
  for (let i = 0; i < categorySlug.length; i++) {
    hash = (hash + categorySlug.charCodeAt(i) * (i + 1)) % 997;
  }
  const picked: typeof locs = [];
  const used = new Set<string>();
  for (let i = 0; picked.length < Math.min(count, locs.length) && i < locs.length * 2; i++) {
    const loc = locs[(hash + i * 11) % locs.length];
    if (!used.has(loc.slug)) {
      used.add(loc.slug);
      picked.push(loc);
    }
  }
  return picked;
}

export function generateStaticParams() {
  return categoryOrder.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seo = getCategoryPageSeo(slug);
  const path = `/categories/${slug}`;

  if (seo) {
    return pageMetadata({
      title: seo.title,
      description: seo.description,
      path,
      absoluteTitle: true,
      keywords: seo.keywords,
    });
  }

  const fallback = getCatalogCategory(slug);
  try {
    const data = await api<{ category: Category }>(`/categories/${slug}`, { revalidate: false });
    const c = data.category;
    return pageMetadata({
      title: `${c.name} | SpicyCenter`,
      description:
        c.seoDescription ??
        c.description?.slice(0, 160) ??
        `Shop ${c.name} at SpicyCenter. Delivering in 5–7 days — confirm shipping on each product page.`,
      path,
    });
  } catch {
    const name = fallback?.name ?? slug.replace(/-/g, " ");
    return pageMetadata({
      title: `${name} | SpicyCenter`,
      description: `Shop ${name} at SpicyCenter. Delivering in 5–7 days.`,
      path,
    });
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const sort = parseStorefrontListingSort(sortParam);

  let category: Category | null = null;
  let products: Product[] = [];
  let total = 0;
  let hasMore = false;

  try {
    const catData = await api<{ category: Category }>(`/categories/${slug}`, { revalidate: false });
    category = catData.category;
  } catch {
    category = getCatalogCategory(slug) ?? null;
  }

  const listing = await loadStorefrontListing({
    category: slug,
    sort,
    revalidate: false,
  });
  products = listing.products;
  total = listing.total;
  hasMore = listing.hasMore;

  if (!category) {
    category = getCatalogCategory(slug) ?? null;
  }

  if (!category && products.length === 0 && !categoryOrder.includes(slug as (typeof categoryOrder)[number])) {
    notFound();
  }

  const name = category?.name ?? slug.replace(/-/g, " ");
  const pageSeo = getCategoryPageSeo(slug);
  const h1 = pageSeo?.h1 ?? name;
  const baseDescription =
    category?.description?.trim() ||
    `Browse our ${name} collection — spice products with destination shipping quotes on each product page.`;
  const extra = getCategoryContent(slug);
  const rich = getCategoryRichContent(slug);
  const shipsTo = pickShipsToCities(slug, 3);
  const heroSrc = category?.image ? resolveImageUrl(category.image) : null;
  const heroAlt = pageSeo?.alt ?? `${name} — SpicyCenter`;

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    { label: name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/categories/${slug}` }))),
          collectionPageJsonLd({
            name: h1,
            path: `/categories/${slug}`,
            description: pageSeo?.description ?? baseDescription,
          }),
          itemListJsonLd(
            `${name} — SpicyCenter`,
            products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))
          ),
          ...(rich ? [faqJsonLd(rich.faqs)] : []),
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold text-primary mb-6">{h1}</h1>

      {heroSrc ? (
        <div className="relative w-full aspect-[21/9] max-h-64 mb-8 overflow-hidden rounded-xl bg-slate-100">
          <Image src={heroSrc} alt={heroAlt} fill className="object-cover" sizes="(max-width: 1280px) 100vw, 1280px" priority />
        </div>
      ) : null}

      {products.length > 0 ? (
        <Suspense fallback={<p className="text-slate-500">Loading products…</p>}>
          <ProductGrid
            products={products}
            total={total}
            hasMore={hasMore}
            listingPage={`category:${slug}`}
            category={slug}
            sort={sort}
          />
        </Suspense>
      ) : (
        <p className="text-slate-500">
          Products loading soon.{" "}
          <Link href="/products" className="text-nav hover:underline">
            Browse all spice items
          </Link>
        </p>
      )}

      <CategoryProductLinks products={products} categoryName={name} total={total} />

      {shipsTo.length > 0 && (
        <section className="mt-8 text-sm text-slate-600">
          <h2 className="font-semibold text-primary mb-2">spice shopping by location</h2>
          <p className="flex flex-wrap gap-x-1 gap-y-1 mb-2">
            {storefrontCountrySeoPages().map((c, i) => (
              <span key={c.slug}>
                <Link href={`/countries/${c.slug}`} className="text-nav hover:underline">
                  {c.name}
                </Link>
                {i < storefrontCountrySeoPages().length - 1 ? <span className="text-slate-400"> · </span> : null}
              </span>
            ))}
          </p>
          <p className="flex flex-wrap gap-x-1 gap-y-1">
            {shipsTo.map((city, i) => (
              <span key={city.slug}>
                <Link href={`/cities/${city.slug}`} className="text-nav hover:underline">
                  {city.label}
                </Link>
                {i < shipsTo.length - 1 ? <span className="text-slate-400"> · </span> : null}
              </span>
            ))}
          </p>
        </section>
      )}

      {rich ? (
        <CategoryContentSection content={rich} categoryName={name} products={products} />
      ) : (
        <>
          <section className="mt-12 pt-10 border-t border-slate-200">
            <div className="grid lg:grid-cols-2 gap-x-12 gap-y-6 text-slate-700 leading-relaxed">
              <div className="space-y-4">
                {baseDescription.split(/(?<=\.)\s+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
                {extra?.extraParagraphs.map((para, i) => (
                  <p key={`extra-${i}`}>{para}</p>
                ))}
              </div>
              {extra?.sections && extra.sections.length > 0 && (
                <div className="space-y-6">
                  {extra.sections.map((section) => (
                    <div key={section.heading}>
                      <h2 className="text-lg font-bold text-primary mb-3">{section.heading}</h2>
                      <ul className="space-y-2 text-sm">
                        {section.paragraphs.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-nav mt-1 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-10 p-6 bg-slate-50 rounded-xl spice-panel">
            <h2 className="font-semibold text-primary mb-3">Why order {name} from SpicyCenter?</h2>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Check the product-page shipping quote for your destination
              </li>
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Premium decorations, spices, and spice packs
              </li>
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Partner fulfillment — transit times vary by item
              </li>
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Secure checkout with Razorpay and Stripe
              </li>
            </ul>
          </section>
        </>
      )}

      <InternalLinksSection
        groups={getInternalLinkGroups({ type: "category", categorySlug: slug })}
        title="Related spice pages"
        intro="Continue to related categories, destination pages, and planning guides."
      />
    </div>
  );
}
