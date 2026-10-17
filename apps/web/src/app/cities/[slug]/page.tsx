import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeProductCard } from "@/components/HomeProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CityContentSection } from "@/components/CityContentSection";
import { JsonLd } from "@/components/JsonLd";
import { getCityContent } from "@/lib/content/city-pages";
import {
  allSeoLocationSlugs,
  cityKeywordsMeta,
  getSeoLocation,
} from "@/lib/content/seo-data";
import { shuffleForCity } from "@/lib/city-products";
import { loadStorefrontProductPreview } from "@/lib/product-loader";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, serviceAreaJsonLd } from "@/lib/seo";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { getInternalLinkGroups } from "@spicycorner/shared";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allSeoLocationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = getSeoLocation(slug);
  if (!loc) return { title: "City" };
  return pageMetadata({
    title: loc.title,
    description: loc.description,
    path: `/cities/${slug}`,
    keywords: cityKeywordsMeta(slug),
    absoluteTitle: true,
  });
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const loc = getSeoLocation(slug);
  const content = getCityContent(slug);
  if (!loc || !content) notFound();

  const products = await loadStorefrontProductPreview();
  const cityProducts = shuffleForCity(products, slug).slice(0, 20);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "United States", href: "/countries/us" },
    { label: loc.label },
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/cities/${slug}` }))),
          faqJsonLd(content.faqs),
          serviceAreaJsonLd({ label: loc.label, slug, state: content.state }),
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold text-primary mb-2">{content.headline || loc.h1}</h1>
      <p className="text-slate-600 mb-8 max-w-3xl">
        Shop Indian spices and wholesale packs for {loc.label}. Delivery times depend on the item and destination —
        check the shipping quote on each product page.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cityProducts.map((p) => (
          <HomeProductCard key={p.slug} product={p} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-slate-500 mt-4">
          No products yet.{" "}
          <Link href="/products" className="text-nav hover:underline">
            Browse all spice items
          </Link>
        </p>
      )}

      <CityContentSection content={content} />

      <InternalLinksSection
        groups={getInternalLinkGroups({ type: "city", citySlug: slug })}
        title="Related spice pages"
        intro="Categories, the USA shopping page, nearby cities, and planning guides."
      />
    </div>
  );
}
