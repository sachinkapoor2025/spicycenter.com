import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
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
          These spices are commonly associated with {region.label}. That is a regional story, not a guarantee that
          every bag on this site is from that state. Read the{" "}
          <Link href="/spice-guide" className="text-nav font-semibold hover:underline">
            spice guide
          </Link>
          , browse the{" "}
          <Link href="/spices" className="text-nav font-semibold hover:underline">
            Indian spice catalogue
          </Link>
          , or request{" "}
          <Link href="/wholesale" className="text-nav font-semibold hover:underline">
            wholesale Indian spices
          </Link>
          . Country of origin and region on the pack must follow the lot.
        </p>
      </div>
      <h2 className="font-serif text-2xl text-primary mt-10">Spices from this region</h2>
      <ul className="mt-4 space-y-3">
        {spices.map((s) => (
          <li key={s.id}>
            {s.canonicalName}
            <span className="text-sm text-muted"> — {s.shortDescription}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
