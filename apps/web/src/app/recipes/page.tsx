import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { loadRecipes } from "@/lib/recipes";

const RECIPES_META_TITLE = "Indian Spice Recipes: Biryani, Dal Tadka | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: RECIPES_META_TITLE,
    description:
      "Indian recipes for UK and European kitchens using whole and ground spices, from home-style biryani to dal tadka. Learn which spices to use and why.",
    path: "/recipes",
    absoluteTitle: true,
  }),
  RECIPES_META_TITLE,
);

export default function RecipesPage() {
  const recipes = loadRecipes();
  const courses = [...new Set(recipes.map((r) => r.course || r.cuisine))];
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Recipes</h1>
      <p className="mt-3 text-muted max-w-2xl leading-relaxed">
        {recipes.length} dishes that show how Indian spices behave in a pan: jeera in ghee, mustard in oil, garam masala
        at the end. They are cooking notes for UK and EU home kitchens, not diet advice. Quantities assume whole or
        freshly ground spices.
      </p>
      <p className="mt-3 text-sm">
        Also see the{" "}
        <Link href="/spice-guide" className="text-nav">
          spice guide
        </Link>
        ,{" "}
        <Link href="/spice-guide/comparisons" className="text-nav">
          comparisons
        </Link>
        , and{" "}
        <Link href="/journal" className="text-nav">
          journal
        </Link>
        .
      </p>
      {courses.map((course) => (
        <section key={course} className="mt-10">
          <h2 className="font-serif text-2xl text-primary">{course}</h2>
          <ul className="mt-4 space-y-4">
            {recipes
              .filter((r) => (r.course || r.cuisine) === course)
              .map((r) => (
                <li key={r.slug} className="card-spice p-5">
                  <Link href={`/recipes/${r.slug}`} className="font-serif text-xl text-nav">
                    {r.title}
                  </Link>
                  <p className="text-sm text-muted mt-1">
                    {r.cuisine}
                    {r.region ? ` · ${r.region}` : ""} — {r.summary}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
