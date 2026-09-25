import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { getSpiceBySlug, loadSpiceEntities } from "@/lib/spice-data";
import { exploreCategories } from "@/lib/site";
import { SpiceSkuCard } from "@/components/SpiceSkuCard";
import { featuredBilingualName } from "@/lib/catalogue";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const spice = getSpiceBySlug(category);
  const cat = exploreCategories.find((c) => c.slug === category);
  const title = spice?.canonicalName ?? cat?.name ?? category;
  return pageMetadata({
    title: `${title} — Indian spice catalogue`,
    description: spice?.shortDescription ?? `Shop ${title} from SpicyCenter.`,
    path: `/spices/${category}`,
  });
}

export function generateStaticParams() {
  const spices = loadSpiceEntities().map((s) => ({ category: s.slug }));
  const cats = exploreCategories.map((c) => ({ category: c.slug }));
  return [...cats, ...spices];
}

export default async function SpiceCategoryPage({ params }: Props) {
  const { category } = await params;
  const spice = getSpiceBySlug(category);
  const cat = exploreCategories.find((c) => c.slug === category);
  const products = getCatalogProducts()
    .filter((p) => {
      if (p.categorySlug === category || p.additionalCategorySlugs?.includes(category)) return true;
      if (spice && p.tags?.includes(`spice:${spice.id}`)) return true;
      return false;
    })
    .slice(0, 60);

  if (!spice && !cat && !products.length) notFound();
  const title = spice?.canonicalName ?? cat?.name ?? category.replace(/-/g, " ");
  const bilingual = featuredBilingualName(title, spice?.slug ?? category);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <p className="text-sm text-muted"><Link href="/spices">Shop</Link> / {title}</p>
      <h1 className="spice-heading text-4xl mt-2">{title}</h1>
      {bilingual ? (
        <p className="text-lg text-muted mt-1" lang="ar" dir="rtl">
          {bilingual.english} — {bilingual.arabic}
        </p>
      ) : null}
      <p className="text-sm text-muted mt-2">Brand: SpicyCenter · Origin: India · Pack sizes from 100 gm to 25 kg</p>
      {spice && (
        <div className="mt-4 max-w-3xl text-muted">
          <p>{spice.description}</p>
          <p className="mt-2 text-sm">
            {spice.hindiName ? `${spice.hindiName} · ` : ""}
            {spice.botanicalName}
          </p>
          <Link href={`/spice-guide/${spice.slug}`} className="text-nav font-semibold mt-3 inline-block">
            Read the {spice.canonicalName} guide →
          </Link>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {products.map((p) => (
          <SpiceSkuCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
