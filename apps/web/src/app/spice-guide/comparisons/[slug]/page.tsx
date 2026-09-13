import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getSpiceBySlug } from "@/lib/spice-data";

type Cmp = { slug: string; a: string; b: string; title: string };

function load(): Cmp[] {
  const path = ["data/comparisons.json", "../../data/comparisons.json"].map((p) => join(process.cwd(), p)).find((p) => existsSync(p));
  if (!path) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function generateStaticParams() {
  return load().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = load().find((x) => x.slug === slug);
  return pageMetadata({
    title: c?.title ?? "Spice comparison",
    description: c ? `${c.title} — culinary differences, not medical advice.` : "Comparison",
    path: `/spice-guide/comparisons/${slug}`,
  });
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = load().find((x) => x.slug === slug);
  if (!c) notFound();
  const a = getSpiceBySlug(c.a);
  const b = getSpiceBySlug(c.b);
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm"><Link href="/spice-guide">Guide</Link></p>
      <h1 className="spice-heading text-4xl mt-2">{c.title}</h1>
      <p className="mt-4 text-muted">Culinary and botanical differences. Traditional use is not scientific evidence.</p>
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {[a, b].filter(Boolean).map((s) => (
          <div key={s!.id} className="card-spice p-5">
            <h2 className="font-serif text-2xl">{s!.canonicalName}</h2>
            <p className="text-sm mt-2">{s!.botanicalName}</p>
            <p className="mt-3 text-sm">{s!.shortDescription}</p>
            <Link href={`/spice-guide/${s!.slug}`} className="text-nav text-sm mt-3 inline-block">Full guide →</Link>
          </div>
        ))}
      </div>
    </article>
  );
}
