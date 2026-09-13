import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { pageMetadata } from "@/lib/seo";

function loadRecipes() {
  const path = ["data/recipes.json", "../../data/recipes.json"].map((p) => join(process.cwd(), p)).find((p) => existsSync(p));
  if (!path) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as { slug: string; title: string; summary: string; cuisine: string }[];
}

export const metadata: Metadata = pageMetadata({
  title: "Indian spice recipes",
  description: "Recipes that show how to cook with Indian spices — not medical advice.",
  path: "/recipes",
});

export default function RecipesPage() {
  const recipes = loadRecipes();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Recipes</h1>
      <ul className="mt-8 space-y-4">
        {recipes.map((r) => (
          <li key={r.slug} className="card-spice p-5">
            <Link href={`/recipes/${r.slug}`} className="font-serif text-xl text-nav">{r.title}</Link>
            <p className="text-sm text-muted mt-1">{r.cuisine} — {r.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
