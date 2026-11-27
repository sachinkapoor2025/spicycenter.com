import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { loadRecipes } from "@/lib/recipes";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { RECIPES_SUPPLIED_H1, RECIPES_SUPPLIED_INTRO, RECIPES_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";

const RECIPES_META_TITLE = "Traditional Indian Recipes and Flavours | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: RECIPES_META_TITLE,
    description:
      "Traditional Indian recipes for rice, dal, curries, vegetables, snacks, breakfast and desserts, with the spices used in each style of cooking.",
    path: "/recipes",
    absoluteTitle: true,
  }),
  RECIPES_META_TITLE,
);

export default function RecipesPage() {
  const recipes = loadRecipes();
  const courses = [...new Set(recipes.map((r) => r.course || r.cuisine))];
  return (
    <div className="w-full px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">{RECIPES_SUPPLIED_H1}</h1>
      {RECIPES_SUPPLIED_INTRO.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-muted max-w-3xl leading-relaxed">
          {paragraph}
        </p>
      ))}
      {courses.map((course) => (
        <section key={course} className="mt-10">
          <h2 className="font-serif text-2xl text-primary">{course}</h2>
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <SuppliedPageCopy sections={RECIPES_SUPPLIED_SECTIONS} className="mt-12" />
    </div>
  );
}
