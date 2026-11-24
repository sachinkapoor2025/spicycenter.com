import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { faqJsonLd, pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { getCatalogProducts, productMatchesCategory } from "@/lib/catalog-fallback";
import { getSpiceBySlug, loadSpiceEntities } from "@/lib/spice-data";
import { exploreCategories } from "@/lib/site";
import { SpiceSkuCard } from "@/components/SpiceSkuCard";
import { featuredBilingualName } from "@/lib/catalogue";
import { JsonLd } from "@/components/JsonLd";
import { getCategoryBatch1 } from "@/lib/content/category-batch1";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { MASALA_SUPPLIED_H1, MASALA_SUPPLIED_INTRO, MASALA_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";

type Props = { params: Promise<{ category: string }> };

const MASALA_META_TITLE = "Indian Masala Blends for Authentic Flavours | SpicyCenter";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (category === "indian-masalas") {
    return withAbsoluteSocialTitle(
      pageMetadata({
        title: MASALA_META_TITLE,
        description:
          "Traditional and regional Indian masala blends for home cooking and food businesses, with pack sizes from 100 grams to 1 metric ton by enquiry.",
        path: `/spices/${category}`,
        absoluteTitle: true,
      }),
      MASALA_META_TITLE,
    );
  }
  const batch = getCategoryBatch1(category);
  if (batch) {
    return withAbsoluteSocialTitle(
      pageMetadata({
        title: batch.title,
        description: batch.description,
        path: `/spices/${category}`,
        absoluteTitle: true,
      }),
      batch.title,
    );
  }
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
  const matched = getCatalogProducts().filter((p) => {
    if (productMatchesCategory(p, category)) return true;
    if (spice && p.tags?.includes(`spice:${spice.id}`)) return true;
    return false;
  });
  const products = category === "indian-chillies" ? matched : matched.slice(0, 60);

  if (!spice && !cat && !products.length) notFound();
  const title = spice?.canonicalName ?? cat?.name ?? category.replace(/-/g, " ");
  const batch = getCategoryBatch1(category);
  const bilingual = featuredBilingualName(title, spice?.slug ?? category);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {batch ? <JsonLd data={faqJsonLd(batch.faqs)} /> : null}
      <p className="text-sm text-muted"><Link href="/spices">Shop</Link> / {title}</p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">{category === "indian-masalas" ? MASALA_SUPPLIED_H1 : batch?.h1 ?? title}</h1>
      {category === "indian-masalas" ? (
        <div className="mt-4 max-w-3xl space-y-3 text-muted leading-relaxed">
          {MASALA_SUPPLIED_INTRO.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : bilingual ? (
        <p className="text-lg text-muted mt-1" lang="ar" dir="rtl">
          {bilingual.english} — {bilingual.arabic}
        </p>
      ) : null}
      {category === "indian-masalas" ? null : batch ? (
        <div className="mt-4 max-w-3xl space-y-4 text-muted leading-relaxed">
          {batch.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted mt-2">Brand: SpicyCenter · Origin: India · Pack sizes from 100 gm to 1 metric ton</p>
      )}
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
      <p className="mt-6 text-sm">
        <Link href={`/rfq?product=${encodeURIComponent(title)}`} className="text-nav font-semibold">
          Submit a sourcing requirement for {title}
        </Link>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {products.map((p) => (
          <SpiceSkuCard key={p.slug} product={p} />
        ))}
      </div>
      {category === "indian-masalas" ? <SuppliedPageCopy sections={MASALA_SUPPLIED_SECTIONS} className="mt-12" /> : null}
      {batch ? (
        <section className="mt-14">
          <h2 className="spice-heading text-2xl sm:text-3xl">FAQs</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {batch.faqs.map((faq) => (
              <div key={faq.q} className="card-spice p-5">
                <h3 className="font-semibold text-primary">{faq.q}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
