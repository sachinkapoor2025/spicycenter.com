import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeProductCard } from "@/components/HomeProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CityContentSection } from "@/components/CityContentSection";
import { JsonLd } from "@/components/JsonLd";
import { cityLinks } from "@/lib/site";
import { getCityContent } from "@/lib/content/city-pages";
import {
  allSeoLocationSlugs,
  cityKeywordsMeta,
  getSeoLocation,
} from "@/lib/content/seo-data";
import { shuffleForCity } from "@/lib/city-products";
import { loadStorefrontProductPreview } from "@/lib/product-loader";
import { spicePathForLegacyCitySlug } from "@/lib/content/geo";
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
  const spicePath = spicePathForLegacyCitySlug(slug);

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
        Shop Indian spices, and wholesale packs for {loc.label}. Delivery times depend on
        the item and destination — check the shipping quote on each product page.
        {spicePath ? (
          <>
            {" "}
            <Link href={spicePath} className="text-nav hover:underline">
              Open the {loc.label} page in the country → region tree
            </Link>
            {slug === "new-york" ? (
              <>
                {" "}
                or{" "}
                <Link href="/spices/usa/new-york/new-york-city" className="text-nav hover:underline">
                  spice New York City
                </Link>
                .
              </>
            ) : (
              "."
            )}
          </>
        ) : null}
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

      <section className="mt-12 p-6 bg-slate-50 rounded-xl text-sm text-slate-600">
        <h2 className="font-semibold text-primary mb-2">Also shop spice in</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {cityLinks
            .filter((c) => c.slug !== slug)
            .slice(0, 12)
            .map((c) => (
              <Link key={c.slug} href={`/cities/${c.slug}`} className="text-nav hover:underline">
                {c.label}
              </Link>
            ))}
        </div>
      </section>

      <InternalLinksSection
        groups={getInternalLinkGroups({ type: "city", citySlug: slug })}
        title="Related spice pages"
        intro="Categories, the USA shopping page, nearby cities, and planning guides."
      />
    </div>
  );
}
