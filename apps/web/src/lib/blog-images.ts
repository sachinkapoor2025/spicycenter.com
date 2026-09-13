import { api } from "@/lib/api";
import type { BlogPost } from "@/lib/content/blog-posts";
import { listAllBlogPosts } from "@/lib/content/blog-posts";

export async function getBlogImageMap(): Promise<Record<string, string>> {
  try {
    // Align with page-level `revalidate = 60` on /blog routes so ISR stays active
    // even when this fetch fails at build time (empty catch must not freeze pages).
    const data = await api<{ images: Record<string, string> }>("/blog-images", { revalidate: 60 });
    return data.images ?? {};
  } catch {
    return {};
  }
}

export function applyBlogImages(posts: BlogPost[], images: Record<string, string>): BlogPost[] {
  return posts.map((post) => ({
    ...post,
    image: images[post.slug] || post.image || '',
  }));
}

export async function loadBlogPostsWithImages(): Promise<BlogPost[]> {
  const [posts, images] = await Promise.all([Promise.resolve(listAllBlogPosts()), getBlogImageMap()]);
  return applyBlogImages(posts, images);
}

export async function loadBlogPostWithImage(slug: string): Promise<BlogPost | undefined> {
  const posts = await loadBlogPostsWithImages();
  return posts.find((p) => p.slug === slug);
}
