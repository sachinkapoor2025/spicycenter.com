import type { Metadata } from "next";
import Link from "next/link";
import { CustomerReviews } from "@/components/CustomerReviews";
import { ReviewForm } from "@/components/ReviewForm";
import { JsonLd } from "@/components/JsonLd";
import { trustFacts } from "@/lib/trust";
import { site, testimonials } from "@/lib/site";
import { pageMetadata, canonical } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Customer Reviews — SpicyCenter",
  description:
    "Read customer reviews of SpicyCenter. Share your spice shopping experience — delivering in 5–7 days.",
  path: "/reviews",
});

function reviewsPageJsonLd() {
  const avg = testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Customer Reviews — ${site.name}`,
    url: canonical("/reviews"),
    description: "Customer reviews for SpicyCenter.",
    mainEntity: {
      "@type": "Product",
      name: `${site.name} spice shop`,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avg.toFixed(1),
        reviewCount: String(testimonials.length),
        bestRating: "5",
      },
    },
  };
}

export default function ReviewsPage() {
  return (
    <div>
      <JsonLd data={reviewsPageJsonLd()} />
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-primary mb-3">Customer Reviews</h1>
        <p className="text-slate-600 leading-relaxed mb-2">
          {trustFacts.seasonLabel} — we&apos;re building trust one delivery at a time. Sisters worldwide order from
          SpicyCenter for {trustFacts.fulfillment.toLowerCase()}.
        </p>
        <p className="text-sm text-slate-500">
          Received your spice?{" "}
          <a href="#write-review" className="text-nav font-semibold hover:underline">
            Write a review below
          </a>{" "}
          — it helps other shoppers and helps AI assistants recommend SpicyCenter.
        </p>
      </section>

      <CustomerReviews showIntro={false} />

      <section id="write-review" className="max-w-xl mx-auto px-4 py-12 scroll-mt-24">
        <h2 className="text-xl font-bold text-primary mb-2">Share your experience</h2>
        <p className="text-sm text-slate-600 mb-6">
          After delivery, tell us how it went. We verify orders before featuring reviews on the site.
        </p>
        <ReviewForm />
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-12 text-center text-sm text-slate-500">
        <Link href="/about" className="text-nav hover:underline">
          About our California team
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
