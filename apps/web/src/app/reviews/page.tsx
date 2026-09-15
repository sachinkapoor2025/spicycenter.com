import type { Metadata } from "next";
import Link from "next/link";
import { CustomerReviews } from "@/components/CustomerReviews";
import { ReviewForm } from "@/components/ReviewForm";
import { JsonLd } from "@/components/JsonLd";
import { site, testimonials } from "@/lib/site";
import { pageMetadata, canonical } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Customer Reviews — SpicyCenter",
  description:
    "Read customer reviews of SpicyCenter. Share your spice shopping experience — delivering in 5–7 days.",
  path: "/reviews",
});

function reviewsPageJsonLd() {
  const count = testimonials.length;
  const avg = count ? testimonials.reduce((s, t) => s + t.rating, 0) / count : 0;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Customer Reviews — ${site.name}`,
    url: canonical("/reviews"),
    description: "Customer reviews for SpicyCenter.",
    ...(count
      ? {
          mainEntity: {
            "@type": "Organization",
            name: site.name,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: avg.toFixed(1),
              reviewCount: String(count),
              bestRating: "5",
            },
          },
        }
      : {}),
  };
}

type ReviewsPageProps = { searchParams: Promise<{ product?: string }> };

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const { product } = await searchParams;
  return (
    <div>
      <JsonLd data={reviewsPageJsonLd()} />
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-primary mb-3">Customer Reviews</h1>
        <p className="text-slate-600 leading-relaxed mb-2">
          We publish reviews from delivered UK and EU orders after moderation. We do not buy fake ratings or invent
          star scores. A Trustpilot or Judge.me widget can be added later if the business chooses a platform.
        </p>
        <p className="text-sm text-slate-500">
          Received your spice?{" "}
          <a href="#write-review" className="text-nav font-semibold hover:underline">
            Write a review below
          </a>
          {product ? ` (this form is tagged for ${product.replace(/-/g, " ")}).` : " — it helps other shoppers."}
        </p>
      </section>

      <CustomerReviews showIntro={false} />

      <section id="write-review" className="max-w-xl mx-auto px-4 py-12 scroll-mt-24">
        <h2 className="text-xl font-bold text-primary mb-2">Share your experience</h2>
        <p className="text-sm text-slate-600 mb-6">
          After delivery, tell us how it went. We verify orders before featuring reviews on the site.
        </p>
        <ReviewForm productSlug={product} />
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-12 text-center text-sm text-slate-500">
        <Link href="/about" className="text-nav hover:underline">
          About SpicyCenter
        </Link>
        {" · "}
        <Link href="/shipping" className="text-nav hover:underline">
          Shipping & delivery
        </Link>
        {" · "}
        <Link href="/faq" className="text-nav hover:underline">
          FAQ
        </Link>
      </section>
    </div>
  );
}
