import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { getJournalPost, listJournalPosts } from "@/lib/content/journal-posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listJournalPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) return { title: "Journal" };
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/journal/${slug}`,
    ogImage: post.image,
  });
}

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) notFound();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Journal", href: "/journal" },
    { label: post.title },
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          articleJsonLd({
            slug: post.slug,
            title: post.title,
            description: post.description,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
            image: post.image,
            path: `/journal/${post.slug}`,
          }),
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/journal/${slug}` }))),
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8">
        <time dateTime={post.publishedAt} className="text-sm text-slate-500">
          {new Date(post.publishedAt).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mt-2 mb-3">{post.title}</h1>
        <p className="text-lg text-slate-600">{post.excerpt}</p>
      </header>
      <div className="space-y-8">
        {post.sections.map((section, i) => (
          <section key={i}>
            {section.heading && <h2 className="text-xl font-bold text-primary mb-3">{section.heading}</h2>}
            {section.paragraphs.map((p, pi) => (
              <p key={p} className="text-slate-700 leading-relaxed mb-4">
                {i === 0 && pi === 0 ? (
                  <>
                    {p}{" "}
                    <Link href="/spice-guide" className="text-nav font-semibold hover:underline">
                      Spice guide
                    </Link>
                    {", "}
                    <Link href="/spices/whole-spices" className="text-nav font-semibold hover:underline">
                      whole spices
                    </Link>
                    {" and "}
                    <Link href="/spices/ground-spices" className="text-nav font-semibold hover:underline">
                      ground spices
                    </Link>
                    {" are listed in the catalogue."}
                  </>
                ) : (
                  p
                )}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
