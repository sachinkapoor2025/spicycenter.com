import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { listJournalPosts } from "@/lib/content/journal-posts";
import { listAllBlogPosts } from "@/lib/content/seo-blog";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { JOURNAL_SUPPLIED_H1, JOURNAL_SUPPLIED_INTRO, JOURNAL_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";

const JOURNAL_META_TITLE = "Indian Spice Journal: Tips and Sourcing | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: JOURNAL_META_TITLE,
    description:
      "The SpicyCenter journal covers Indian spice varieties, storage, cooking techniques, harvests and sourcing for cooks and food businesses.",
    path: "/journal",
    absoluteTitle: true,
  }),
  JOURNAL_META_TITLE,
);

export default function JournalPage() {
  const journal = listJournalPosts();
  const blog = listAllBlogPosts();
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="spice-heading text-3xl sm:text-4xl">{JOURNAL_SUPPLIED_H1}</h1>
      {JOURNAL_SUPPLIED_INTRO.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-muted leading-relaxed max-w-3xl">
          {paragraph}
        </p>
      ))}
      <h2 className="font-serif text-2xl text-primary mt-10">Journal</h2>
      <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {journal.map((post) => (
          <li key={post.slug} className="card-spice p-5">
            <Link href={`/journal/${post.slug}`} className="font-serif text-xl text-nav">
              {post.title}
            </Link>
            <p className="text-sm text-muted mt-1">{post.excerpt}</p>
          </li>
        ))}
      </ul>
      <h2 className="font-serif text-2xl text-primary mt-12">From the blog</h2>
      <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {blog.map((post) => (
          <li key={post.slug} className="card-spice p-5">
            <Link href={`/blog/${post.slug}`} className="font-serif text-lg text-nav">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm">
        <Link href="/spice-guide" className="text-nav">
          Spice guide
        </Link>
        {" · "}
        <Link href="/recipes" className="text-nav">
          Recipes
        </Link>
        {" · "}
        <Link href="/spice-guide/comparisons" className="text-nav">
          Comparisons
        </Link>
      </p>
      <SuppliedPageCopy sections={JOURNAL_SUPPLIED_SECTIONS} className="mt-12" />
    </div>
  );
}
