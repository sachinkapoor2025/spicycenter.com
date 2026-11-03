import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { listJournalPosts } from "@/lib/content/journal-posts";
import { listAllBlogPosts } from "@/lib/content/seo-blog";

const JOURNAL_META_TITLE = "Spice Journal: Guides, Storage & Cooking Notes | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: JOURNAL_META_TITLE,
    description:
      "Spice guides and storage advice from SpicyCenter for UK and European kitchens. Learn how to store Indian spices and choose between whole and ground.",
    path: "/journal",
    absoluteTitle: true,
  }),
  JOURNAL_META_TITLE,
);

export default function JournalPage() {
  const journal = listJournalPosts();
  const blog = listAllBlogPosts();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="spice-heading text-4xl">Spice journal</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Longer notes for UK and EU cooks: storage, substitutions, harvest calendars, and import FAQs. Articles use
        Article schema. They are culinary and operational, not medical claims and not live farm reports we have not
        filed.
      </p>
      <h2 className="font-serif text-2xl text-primary mt-10">Journal</h2>
      <ul className="mt-4 space-y-4">
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
      <ul className="mt-4 space-y-3">
        {blog.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="text-nav">
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
    </div>
  );
}
