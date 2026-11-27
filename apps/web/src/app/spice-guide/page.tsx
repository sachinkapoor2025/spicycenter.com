import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { loadSpiceEntities } from "@/lib/spice-data";
import { spiceGuideGroup } from "@/lib/content/spice-display";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice guide — 88 spices, herbs and masalas",
  description:
    "Encyclopaedia of Indian spices sold at SpicyCenter: Hindi and botanical names, origin, whole vs ground, cooking uses. No unsupported health claims.",
  path: "/spice-guide",
});

const GROUP_ORDER = [
  "Seeds & everyday spices",
  "Aromatics & premium",
  "Indian chillies",
  "Peppers",
  "Rhizomes & roots",
  "Leaves & herbs",
  "Masalas & blends",
  "South Indian blends",
  "Regional blends",
];

export default function SpiceGuideIndex() {
  const spices = loadSpiceEntities();
  const grouped = new Map<string, typeof spices>();
  for (const s of spices) {
    const g = spiceGuideGroup(s);
    grouped.set(g, [...(grouped.get(g) ?? []), s]);
  }
  const groups = [...GROUP_ORDER.filter((g) => grouped.has(g)), ...[...grouped.keys()].filter((g) => !GROUP_ORDER.includes(g))];

  return (
    <div className="w-full px-4 py-10">
      <h1 className="spice-heading text-4xl">Spice guide</h1>
      <p className="mt-3 text-muted max-w-2xl">
        {spices.length} Indian spices, herbs, seeds and masalas. Each guide covers the name, flavour, culinary uses and growing regions.
      </p>
      <p className="mt-4 text-sm text-muted max-w-3xl leading-relaxed">
        Compare similar spices in the{" "}
        <Link href="/spice-guide/comparisons" className="text-nav font-semibold hover:underline">
          spice comparisons
        </Link>
        , cook from{" "}
        <Link href="/recipes" className="text-nav font-semibold hover:underline">
          Indian spice recipes
        </Link>
        , or buy from the{" "}
        <Link href="/spices" className="text-nav font-semibold hover:underline">
          Indian spice catalogue
        </Link>
        .
      </p>
      {groups.map((group) => (
        <section key={group} className="mt-10">
          <h2 className="font-serif text-2xl text-primary">{group}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {(grouped.get(group) ?? []).map((s) => (
              <Link key={s.id} href={`/spice-guide/${s.slug}`} className="card-spice p-4">
                <p className="font-serif text-lg">{s.canonicalName}</p>
                <p className="text-sm text-muted">
                  {s.hindiName}
                  {s.botanicalName ? ` · ${s.botanicalName}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
