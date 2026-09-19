import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getSourcingGuide, SOURCING_GUIDES } from "@/lib/sourcing-guides";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";

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
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="spice-kicker">
        <Link href="/guides" className="text-nav">
          Guides
        </Link>
      </p>
      <h1 className="spice-heading text-4xl mt-2">{guide.title}</h1>
      <p className="mt-4 text-muted">{guide.description}</p>
      {guide.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-serif text-2xl text-primary">{s.heading}</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">{s.body}</p>
        </section>
      ))}
      <FreeEnquiryCtas />
    </div>
  );
}
