import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getSpiceBySlug, loadSpiceEntities } from "@/lib/spice-data";
import { getComparison, loadComparisons } from "@/lib/content/comparisons";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { getRecipeBySlug } from "@/lib/recipes";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return loadComparisons().flatMap((c) => {
    const extra =
      c.slug === "cassia-vs-cinnamon"
        ? [{ slug: "cinnamon-vs-cassia" }]
        : c.slug === "green-cardamom-vs-black-cardamom"
          ? [{ slug: "black-cardamom-vs-green-cardamom" }]
          : [];
    return [{ slug: c.slug }, ...extra];
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  return pageMetadata({
    title: c?.title ?? "Spice comparison",
    description: c?.metaDescription ?? "Comparison",
    path: `/spice-guide/comparisons/${slug}`,
  });
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();
  const a = getSpiceBySlug(c.a);
  const b = getSpiceBySlug(c.b);
  const spices = [a, b].filter(Boolean);
  const uniqueSpices = spices.filter((s, i) => spices.findIndex((x) => x!.id === s!.id) === i);
  const products = getCatalogProducts()
    .filter((p) => uniqueSpices.some((s) => p.tags?.includes(`spice:${s!.id}`)))
    .slice(0, 8);
  const recipes = (c.relatedRecipes ?? []).map(getRecipeBySlug).filter(Boolean);

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          articleJsonLd({
            slug: c.slug,
            title: c.title,
            description: c.metaDescription,
            publishedAt: "2026-09-15",
            updatedAt: "2026-09-15",
            path: `/spice-guide/comparisons/${c.slug}`,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Spice guide", path: "/spice-guide" },
            { name: "Comparisons", path: "/spice-guide/comparisons" },
            { name: c.title, path: `/spice-guide/comparisons/${slug}` },
          ]),
        ]}
      />
      <p className="text-sm text-muted">
        <Link href="/spice-guide">Spice guide</Link>
        {" / "}
        <Link href="/spice-guide/comparisons">Comparisons</Link>
      </p>
      <h1 className="spice-heading text-4xl mt-2">{c.title}</h1>
      <p className="mt-4 text-lg text-muted">{c.intro}</p>
      <p className="mt-3 text-sm text-muted">Culinary differences only. Traditional use is not scientific evidence of a medical effect.</p>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {uniqueSpices.map((s) => (
          <div key={s!.id} className="card-spice p-5">
            <h2 className="font-serif text-2xl">{s!.canonicalName}</h2>
            <p className="text-sm mt-1 text-muted">
              {s!.hindiName}
              {s!.botanicalName ? ` · ${s!.botanicalName}` : ""}
            </p>
            <p className="mt-3 text-sm">{s!.shortDescription}</p>
            <Link href={`/spice-guide/${s!.slug}`} className="text-nav text-sm mt-3 inline-block">
              Full guide →
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-primary">Flavour and kitchen job</h2>
        <p className="mt-3 leading-relaxed">{c.flavour}</p>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-primary">When to use which</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5">
          <li>{c.whenA}</li>
          <li>{c.whenB}</li>
        </ul>
        <p className="mt-4 font-medium">{c.verdict}</p>
      </section>

      {recipes.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-primary">Recipes</h2>
          <ul className="mt-3 space-y-2">
            {recipes.map((r) => (
              <li key={r!.slug}>
                <Link className="text-nav" href={`/recipes/${r!.slug}`}>
                  {r!.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-primary">Shop these spices</h2>
          <ul className="mt-3 space-y-2">
            {products.map((p) => (
              <li key={p.slug}>
                <Link className="text-nav text-sm" href={`/products/${p.slug}`}>
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm">
        All {loadSpiceEntities().length} spice guides: <Link className="text-nav" href="/spice-guide">spice encyclopaedia</Link>
      </p>
    </article>
  );
}
