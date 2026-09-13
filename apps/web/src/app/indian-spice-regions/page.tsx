import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { regionLinks } from "@/lib/site";
import { loadSpiceEntities } from "@/lib/spice-data";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice regions",
  description: "Kerala, Rajasthan, Gujarat, Andhra Pradesh, Kashmir and other Indian spice-growing regions.",
  path: "/indian-spice-regions",
});

export default function RegionsIndex() {
  const spices = loadSpiceEntities();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spice regions</h1>
      <p className="mt-3 text-muted">Landing pages for real growing and trading regions — not doorway pages.</p>
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        {regionLinks.map((r) => {
          const local = spices.filter((s) => s.growingRegions.some((g) => g.toLowerCase().includes(r.label.toLowerCase().split(" ")[0])));
          return (
            <Link key={r.slug} href={`/indian-spice-regions/${r.slug}`} className="card-spice p-5">
              <p className="font-serif text-xl">{r.label}</p>
              <p className="text-sm text-muted mt-1">{local.slice(0, 4).map((s) => s.canonicalName).join(", ") || "Regional spices"}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
