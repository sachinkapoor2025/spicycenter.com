import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";

type Recipe = { slug: string; title: string; summary: string; cuisine: string; spiceIds: string[] };

function recipes(): Recipe[] {
  const path = ["data/recipes.json", "../../data/recipes.json"].map((p) => join(process.cwd(), p)).find((p) => existsSync(p));
  if (!path) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function generateStaticParams() {
  return recipes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = recipes().find((x) => x.slug === slug);
  return pageMetadata({
    title: r?.title ?? "Recipe",
    description: r?.summary ?? "Indian recipe",
    path: `/recipes/${slug}`,
  });
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = recipes().find((x) => x.slug === slug);
  if (!r) notFound();
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm"><Link href="/recipes">Recipes</Link></p>
      <h1 className="spice-heading text-4xl mt-2">{r.title}</h1>
      <p className="mt-3 text-muted">{r.summary} Household recipes vary; this is a culinary overview, not a certified method.</p>
      <h2 className="font-serif text-2xl mt-8">Spices</h2>
      <ul className="mt-3 space-y-2">
        {r.spiceIds.map((id) => (
          <li key={id}><Link className="text-nav" href={`/spice-guide/${id}`}>{id.replace(/-/g, " ")}</Link></li>
        ))}
      </ul>
    </article>
  );
}
