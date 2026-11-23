import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { getSourcingGuide, SOURCING_GUIDES } from "@/lib/sourcing-guides";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { mePlacesByKind } from "@/lib/middle-east-locations";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SOURCING_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getSourcingGuide(slug);
  if (!guide) return { title: "Guide" };
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${slug}`,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getSourcingGuide(slug);
  if (!guide) notFound();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid lg:grid-cols-[minmax(0,42rem)_minmax(16rem,1fr)] gap-10 items-start">
      <article>
      <HubBreadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.title, path: `/guides/${slug}` },
        ]}
      />
      <p className="spice-kicker">
        <Link href="/guides" className="text-nav">
          Guides
        </Link>
      </p>
      <h1 className="spice-heading text-4xl mt-2">{guide.title}</h1>
      <p className="mt-4 text-muted">
        {guide.description} Continue with the{" "}
        <Link href="/spice-guide" className="text-nav font-semibold hover:underline">
          spice guide
        </Link>
        ,{" "}
        <Link href="/wholesale" className="text-nav font-semibold hover:underline">
          wholesale Indian spices
        </Link>
        , or a{" "}
        <Link href="/enquiry" className="text-nav font-semibold hover:underline">
          free spice enquiry
        </Link>
        .
      </p>
      {guide.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-serif text-2xl text-primary">{s.heading}</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">{s.body}</p>
        </section>
      ))}
      {slug === "gcc-import" && (
        <ul className="mt-8 flex flex-wrap gap-3 text-sm">
          {mePlacesByKind("country")
            .filter((p) =>
              ["uae", "saudi-arabia", "qatar", "kuwait", "oman", "bahrain"].includes(p.marketSlug)
            )
            .map((p) => (
              <li key={p.slug}>
                <Link href={`/middle-east/${p.slug}`} className="text-nav font-semibold">
                  {p.name}
                </Link>
              </li>
            ))}
          <li>
            <Link href="/middle-east/dubai" className="text-nav font-semibold">
              Dubai
            </Link>
          </li>
        </ul>
      )}
      <FreeEnquiryCtas />
      </article>
      <aside>
        <h2 className="font-serif text-2xl text-primary">More guides</h2>
        <ul className="mt-4 space-y-3">
          {SOURCING_GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="text-nav font-semibold hover:underline">
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
