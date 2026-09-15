import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { regionLinks, regionStories } from "@/lib/site";
import { loadSpiceEntities } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return regionLinks.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = regionLinks.find((r) => r.slug === slug);
  return pageMetadata({
    title: `${region?.label ?? slug} spices — growing regions, harvest and cooking`,
    description: `Indian spices associated with ${region?.label ?? slug}: climate, harvest season, named spices, and shop links. Origin on a pack must match the actual lot.`,
    path: `/indian-spice-regions/${slug}`,
  });
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = regionLinks.find((r) => r.slug === slug);
  if (!region) notFound();
  const needle = region.label.toLowerCase().split(" ")[0];
  const spices = loadSpiceEntities().filter((s) =>
    s.growingRegions.some((g) => g.toLowerCase().includes(needle)) || s.origin.toLowerCase().includes(needle)
  );

  const story = regionStories[region.slug];
  const spiceIds = new Set(spices.map((s) => s.id));
  const products = getCatalogProducts()
    .filter((p) => p.tags?.some((t) => t.startsWith("spice:") && spiceIds.has(t.slice(6))))
    .slice(0, 12);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Indian spice regions", path: "/indian-spice-regions" },
          { name: region.label, path: `/indian-spice-regions/${slug}` },
        ])}
      />
      <p className="text-sm text-muted"><Link href="/indian-spice-regions">Regions</Link> / {region.label}</p>
      <h1 className="spice-heading text-4xl mt-2">{region.label} spices</h1>
      <div className="mt-4 space-y-4 text-muted leading-relaxed">
        <p>{story.intro}</p>
        <h2 className="font-serif text-2xl text-primary pt-4">Growing conditions</h2>
        <p>{story.climate}</p>
        <p>{story.growing}</p>
        <h2 className="font-serif text-2xl text-primary pt-4">Harvest season</h2>
        <p>{story.harvest}</p>
        <h2 className="font-serif text-2xl text-primary pt-4">How it cooks</h2>
        <p>{story.cooking}</p>
        <p>
          These spices are commonly associated with {region.label}. That is a regional story, not a guarantee that every bag on this site is from that state. Country of origin and region on the pack must follow the lot.
        </p>
      </div>
      <h2 className="font-serif text-2xl text-primary mt-10">Spices from this region</h2>
      <ul className="mt-4 space-y-3">
        {spices.map((s) => (
          <li key={s.id}>
            <Link href={`/spice-guide/${s.slug}`} className="text-nav font-semibold">{s.canonicalName}</Link>
            <span className="text-sm text-muted"> — {s.shortDescription}</span>
            {" "}
            <Link href={`/spices/${s.slug}`} className="text-nav text-sm">Shop</Link>
          </li>
        ))}
      </ul>
      {products.length > 0 && (
        <>
          <h2 className="font-serif text-2xl text-primary mt-10">Shop packs</h2>
          <ul className="mt-3 space-y-1">
            {products.map((p) => (
              <li key={p.slug}>
                <Link className="text-nav text-sm" href={`/products/${p.slug}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-8 text-sm">
        <Link href="/journal/seasonal-spice-harvest-india" className="text-nav">Harvest journal →</Link>
        {" · "}
        <Link href="/spice-guide" className="text-nav">All spice guides →</Link>
      </p>
    </div>
  );
}
