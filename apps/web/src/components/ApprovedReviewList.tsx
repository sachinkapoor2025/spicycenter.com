"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export type ApprovedReview = {
  reviewId: string;
  authorName: string;
  country?: string;
  productSlug: string;
  rating: number;
  body: string;
  title?: string;
  published?: boolean;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-500" : "text-slate-300"} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

/** Published reviews only. Empty when the API has none — never invent ratings. */
export function ApprovedReviewList({
  productSlug,
  productName,
}: {
  productSlug?: string;
  productName?: string;
}) {
  const [reviews, setReviews] = useState<ApprovedReview[] | null>(null);

  useEffect(() => {
    if (!productSlug) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    api<{ reviews?: ApprovedReview[] }>(`/products/${encodeURIComponent(productSlug)}/reviews`, {
      revalidate: false,
      timeoutMs: 2500,
    })
      .then((data) => {
        if (cancelled) return;
        const published = (data.reviews ?? []).filter((review) => review.published !== false && review.body?.trim());
        setReviews(published);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  const reviewHref = productSlug ? `/reviews?product=${encodeURIComponent(productSlug)}` : "/reviews";

  if (reviews === null) {
    return <p className="text-sm text-muted">Loading approved reviews…</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-[#e6d5bc] bg-paper px-4 py-4">
        <p className="font-semibold text-primary">Customer reviews</p>
        <p className="text-sm text-muted mt-1">
          No approved reviews{productName ? ` for ${productName}` : ""} yet. We only publish reviews after they are
          checked. Name, country, product, review text and rating are stored for moderation — nothing is invented.
        </p>
        <Link href={reviewHref} className="text-nav font-semibold text-sm mt-2 inline-block">
          Write a review →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.reviewId} className="rounded-lg border border-[#e6d5bc] bg-paper px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-primary">{review.authorName}</span>
              {review.country ? <span className="text-xs text-muted">{review.country}</span> : null}
              <Stars rating={review.rating} />
            </div>
            <p className="text-xs text-muted mt-1">{productName || review.productSlug.replace(/-/g, " ")}</p>
            {review.title ? <p className="font-medium text-sm mt-2">{review.title}</p> : null}
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{review.body}</p>
          </li>
        ))}
      </ul>
      <Link href={reviewHref} className="text-nav font-semibold text-sm inline-block">
        Write a review →
      </Link>
    </div>
  );
}
