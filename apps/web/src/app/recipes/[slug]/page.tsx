import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, recipeJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getRecipeBySlug, loadRecipes } from "@/lib/recipes";
import { getSpiceBySlug } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return loadRecipes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getRecipeBySlug(slug);
  return pageMetadata({
    title: r ? `${r.title} recipe with Indian spices` : "Recipe",
    description: r?.summary ?? "Indian recipe using named spices from SpicyCenter.",
    path: `/recipes/${slug}`,
  });
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const r = getRecipeBySlug(slug);
  if (!r) notFound();
  const spices = r.spiceIds.map((id) => getSpiceBySlug(id)).filter(Boolean);
  const products = getCatalogProducts()
    .filter((p) => r.spiceIds.some((id) => p.tags?.includes(`spice:${id}`)))
    .slice(0, 10);

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          recipeJsonLd(r),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Recipes", path: "/recipes" },
            { name: r.title, path: `/recipes/${slug}` },
          ]),
        ]}
      />
      <p className="text-sm text-muted">
        <Link href="/recipes">Recipes</Link>
        {r.cuisine ? ` / ${r.cuisine}` : ""}
      </p>
      <h1 className="spice-heading text-4xl mt-2">{r.title}</h1>
      <p className="mt-3 text-lg text-muted">{r.summary}</p>
      <p className="mt-2 text-sm text-muted">
        Household recipes vary; this is a culinary overview for UK home cooks, not a certified restaurant method and not diet advice.
      </p>
      <p className="mt-4 text-sm">
        {r.servings ? `${r.servings} servings` : ""}
        {r.prepMinutes ? ` · Prep ${r.prepMinutes} min` : ""}
        {r.cookMinutes ? ` · Cook ${r.cookMinutes} min` : ""}
        {r.region ? ` · ${r.region}` : ""}
      </p>

      {r.ingredients?.length ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-primary">Ingredients</h2>
          <ul className="mt-3 space-y-1 list-disc pl-5">
            {r.ingredients.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {r.steps?.length ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-primary">Method</h2>
          <ol className="mt-3 space-y-3 list-decimal pl-5">
            {r.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-primary">Spices used</h2>
        <ul className="mt-3 space-y-2">
          {spices.map((s) => (
            <li key={s!.id}>
              <Link className="text-nav" href={`/spice-guide/${s!.slug}`}>
                {s!.canonicalName}
              </Link>
              {s!.hindiName ? <span className="text-muted text-sm"> ({s!.hindiName})</span> : null}
              <Link className="text-nav text-sm ml-2" href={`/spices/${s!.slug}`}>
                Shop →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {products.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-primary">Buy the spices</h2>
          <ul className="mt-3 space-y-1">
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
    </article>
  );
}
