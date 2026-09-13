import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listAllBlogPosts } from "@/lib/content/seo-blog";
import { pageMetadata } from "@/lib/seo";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { getInternalLinkGroups } from "@spicycorner/shared";

export const metadata: Metadata = pageMetadata({
  title: "Spice blog — Indian spices, bulk buying, curry notes",
  description:
    "Culinary notes on Indian spices, whole vs ground, and UK bulk buying from SpicyCorner. Not medical advice.",
  path: "/blog",
});

export default function BlogPage() {
  const posts = listAllBlogPosts();
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 overflow-x-hidden">
      <h1 className="text-3xl font-bold text-primary mb-2">Spice guides and blog</h1>
      <p className="text-slate-600 mb-8">
        Culinary articles on{" "}
        <Link href="/spices/whole-spices" className="text-nav hover:underline">
          whole spices
        </Link>
        ,{" "}
        <Link href="/spices/indian-chillies" className="text-nav hover:underline">
          Indian chillies
        </Link>
        , and{" "}
        <Link href="/wholesale" className="text-nav hover:underline">
          wholesale buying
        </Link>
        . Start with the{" "}
        <Link href="/spice-guide" className="text-nav hover:underline">
          spice guide
        </Link>
        .
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white flex flex-col"
          >
            <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] bg-slate-100 flex items-center justify-center p-2">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-contain p-1"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </Link>
            <div className="p-5 flex flex-col flex-1 min-w-0">
              <time dateTime={post.publishedAt} className="text-xs text-slate-400">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h2 className="text-lg font-bold text-primary mt-1 mb-2 leading-snug">
                <Link href={`/blog/${post.slug}`} className="hover:text-nav break-words">
                  {post.title}
                </Link>
              </h2>
              <p className="text-slate-600 text-sm mb-4 flex-1 break-words">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="text-nav font-semibold text-sm hover:underline">
                Read full guide →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <InternalLinksSection
        groups={getInternalLinkGroups({ type: "guide" })}
        title="Shop and plan spice"
        intro="From the blog hub, continue to categories, destinations, and the main spice guide."
      />
    </div>
  );
}
