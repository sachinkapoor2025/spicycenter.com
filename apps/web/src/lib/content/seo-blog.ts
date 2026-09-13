import { blogPosts, type BlogPost } from "./blog-posts";

export function listAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0
  );
}

export function resolveBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
