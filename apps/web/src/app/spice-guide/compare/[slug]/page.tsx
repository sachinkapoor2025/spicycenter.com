import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { COMPARISONS } from "@/lib/spice/catalog";
import { getSpiceBySlug } from "@/lib/spice/entities";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cmp = COMPARISONS.find((c) => c.slug === slug);
  if (!cmp) return {};
  return pageMetadata({ title: cmp.title, description: `How ${cmp.title.toLowerCase()} differ in flavour, use, and botany.`, path: `/spice-guide/compare/${slug}` });
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cmp = COMPARISONS.find((c) => c.slug === slug);
  if (!cmp) notFound();
  const a = getSpiceBySlug(cmp.a);
  const b = getSpiceBySlug(cmp.b);
  if (!a || !b) notFound();
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-4xl">{cmp.title}</h1>
      <p className="mt-3 text-slate-600">These are different spices (or forms). Use this table to choose; then buy retail or bulk from the linked products.</p>
      <table className="mt-6 w-full text-sm border">
        <thead>
          <tr className="bg-white/60">
            <th className="p-2 text-left" />
            <th className="p-2 text-left">{a.canonicalName}</th>
            <th className="p-2 text-left">{b.canonicalName}</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Botanical", a.botanicalName, b.botanicalName],
            ["Hindi", a.hindiName, b.hindiName],
            ["Flavour", a.flavourProfile, b.flavourProfile],
            ["Heat", a.heatLevel, b.heatLevel],
            ["Typical use", a.culinaryUses.join(", "), b.culinaryUses.join(", ")],
          ].map((row) => (
            <tr key={row[0]} className="border-t">
              {row.map((cell) => (
                <td key={cell} className="p-2 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 flex gap-4">
        <Link className="text-nav" href={`/spice-guide/${a.slug}`}>{a.canonicalName} guide</Link>
        <Link className="text-nav" href={`/spice-guide/${b.slug}`}>{b.canonicalName} guide</Link>
      </p>
    </article>
  );
}
