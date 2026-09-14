import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { regionLinks, regionStories } from "@/lib/site";
import { loadSpiceEntities } from "@/lib/spice-data";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return regionLinks.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = regionLinks.find((r) => r.slug === slug);
  return pageMetadata({
    title: `${region?.label ?? slug} spices`,
    description: `Indian spices associated with ${region?.label ?? slug}. Origin on a pack must match the actual lot.`,
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm text-muted"><Link href="/indian-spice-regions">Regions</Link> / {region.label}</p>
      <h1 className="spice-heading text-4xl mt-2">{region.label} spices</h1>
      <div className="mt-4 space-y-4 text-muted leading-relaxed">
        <p>{story.intro}</p>
        <p>{story.growing}</p>
        <p>{story.cooking}</p>
        <p>
          These spices are commonly associated with {region.label}. That is a regional story, not a guarantee that every bag on this site is from that state. Country of origin and region on the pack must follow the lot.
        </p>
      </div>
      <ul className="mt-8 space-y-3">
        {spices.map((s) => (
          <li key={s.id}>
            <Link href={`/spice-guide/${s.slug}`} className="text-nav font-semibold">{s.canonicalName}</Link>
            <span className="text-sm text-muted"> — {s.shortDescription}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
