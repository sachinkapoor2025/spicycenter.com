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
      <div className="mt-6 space-y-3 text-sm text-muted max-w-3xl leading-relaxed">
        <p>
          Each guide covers English and Hindi names, botanical name when it is useful, growing regions, how the spice is used in
          Indian cooking, and what to check on a pack (whole vs ground, heat vs colour for chilli, freshness for seeds).
        </p>
        <p>
          We do not treat turmeric as medicine, cumin as a cure, or saffron as a supplement. Traditional kitchen use is described
          as cooking. If a health claim needs a clinical source we do not have, it stays off the page.
        </p>
        <p>
          Start with cumin, turmeric, coriander, chilli, mustard, fenugreek, cardamom, clove, cinnamon/cassia and black pepper —
          then open comparisons when two spices are confused in UK shops (cumin vs caraway, cassia vs cinnamon).
        </p>
      </div>
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
