import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { blogPostInlineLinks } from "@/lib/content/page-inline-links";
import { listAllBlogPosts, resolveBlogPost } from "@/lib/content/seo-blog";
import { applyInlineLinks } from "@/lib/inline-links";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { getInternalLinkGroups } from "@spicycorner/shared";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listAllBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = resolveBlogPost(slug);
  if (!post) return { title: "Article" };
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${slug}`,
    ogImage: post.image,
    absoluteTitle: post.title.length > 55,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = resolveBlogPost(slug);
  if (!post) notFound();

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];
  const inlineLinks = blogPostInlineLinks[post.slug] ?? [];

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 overflow-x-hidden min-w-0 w-full">
      <JsonLd
        data={[
          articleJsonLd(post),
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/blog/${slug}` }))),
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 min-w-0">
        <time dateTime={post.publishedAt} className="text-sm text-slate-500">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mt-2 mb-3 break-words">{post.title}</h1>
        <p className="text-base sm:text-lg text-slate-600 break-words">{post.excerpt}</p>
      </header>

      <div className="relative w-full max-h-[420px] min-h-[200px] rounded-xl overflow-hidden mb-8 bg-slate-100 flex items-center justify-center">
        <Image
          src={post.image}
          alt={post.title}
          width={1200}
          height={675}
          className="w-full h-auto max-h-[420px] object-contain"
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
      </div>

      <div className="space-y-8 min-w-0 break-words [overflow-wrap:anywhere]">
        {post.sections.map((section, i) => (
          <section key={i} className="min-w-0">
            {section.heading && (
              <h2 className="text-xl font-bold text-primary mb-3 break-words">{section.heading}</h2>
            )}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-slate-700 leading-relaxed mb-4 break-words [overflow-wrap:anywhere]">
                {applyInlineLinks(p, inlineLinks)}
              </p>
            ))}
          </section>
        ))}
      </div>

      {post.relatedCategory && (
        <div className="mt-10 p-6 bg-slate-50 rounded-xl border min-w-0">
          <h2 className="font-semibold text-primary mb-2">Shop related spice items</h2>
          <Link href={`/categories/${post.relatedCategory}`} className="text-nav font-semibold hover:underline">
            Browse {post.relatedCategory.replace(/-/g, " ")} →
          </Link>
        </div>
      )}

      <InternalLinksSection
        groups={getInternalLinkGroups({
          type: "blog",
          blogSlug: post.slug,
          relatedCategory: post.relatedCategory,
        })}
        title="Keep reading and shopping"
        intro="Related guides, categories, and spice destination pages."
      />

      <div className="mt-8 pt-6 border-t">
        <Link href="/blog" className="text-nav hover:underline text-sm">
          ← All articles
        </Link>
      </div>
    </article>
  );
}
