import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { loadSpiceEntities } from "@/lib/spice-data";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice guide",
  description: "Encyclopaedia of Indian spices: names, origin, grades, cooking uses and buying notes. No unsupported health claims.",
  path: "/spice-guide",
});

export default function SpiceGuideIndex() {
  const spices = loadSpiceEntities();
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Spice guide</h1>
      <p className="mt-3 text-muted max-w-2xl">
        Learn about Indian spices, then buy 100g or 25kg. Culinary facts and traditional use are separated from scientific evidence.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-8">
        {spices.map((s) => (
          <Link key={s.id} href={`/spice-guide/${s.slug}`} className="card-spice p-4">
            <p className="font-serif text-lg">{s.canonicalName}</p>
            <p className="text-sm text-muted">{s.botanicalName}</p>
          </Link>
        ))}
      </div>
      <p className="mt-8"><Link href="/spice-guide/comparisons/cumin-vs-caraway" className="text-nav">Comparison pages →</Link></p>
    </div>
  );
}
