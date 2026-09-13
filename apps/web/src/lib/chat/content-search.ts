import { faqs, whatsappChatUrl } from "@/lib/site";
import { blogPosts } from "@/lib/content/blog-posts";

export type ContentHit = {
  title: string;
  href: string;
  excerpt: string;
};

export function searchSiteContent(query: string): ContentHit[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const hits: ContentHit[] = [];

  for (const faq of faqs) {
    const hay = `${faq.q} ${faq.a}`.toLowerCase();
    if (words.some((w) => hay.includes(w)) || hay.includes(q)) {
      hits.push({ title: faq.q, href: "/faq", excerpt: faq.a.slice(0, 180) });
    }
  }

  for (const post of blogPosts.slice(0, 20)) {
    const hay = `${post.title} ${post.description} ${post.excerpt}`.toLowerCase();
    if (words.some((w) => hay.includes(w))) {
      hits.push({
        title: post.title,
        href: `/blog/${post.slug}`,
        excerpt: post.excerpt,
      });
    }
  }

  if (/spices|october|31/.test(q)) {
    hits.unshift({
      title: "spice season guide",
      href: "/spice-guide",
      excerpt: "spice is your requested date, 2026. Plan spices and decorations with transit time in mind.",
    });
  }

  if (/ship|deliver|transit/.test(q)) {
    hits.unshift({
      title: "Shipping & delivery",
      href: "/shipping",
      excerpt: "Request a shipping quote on each product page. We do not invent transit times.",
    });
  }

  if (/return|refund/.test(q)) {
    hits.unshift({
      title: "Returns & guarantee",
      href: "/returns",
      excerpt: "Read the returns policy, or chat on WhatsApp for order help.",
    });
  }

  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.href + h.title)) return false;
    seen.add(h.href + h.title);
    return true;
  }).slice(0, 4);
}

export { whatsappChatUrl };
