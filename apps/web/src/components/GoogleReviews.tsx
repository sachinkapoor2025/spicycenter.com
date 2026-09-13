"use client";

import { useState } from "react";
import Link from "next/link";
import type { GoogleReview, GoogleReviewsPayload } from "@/lib/google-reviews";

const PREVIEW_CHARS = 140;

function GoogleGIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-label="Google review" role="img">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-amber-400" : "text-slate-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function avatarTone(name: string): string {
  const tones = [
    "bg-primary",
    "bg-nav",
    "bg-[#5b7a3a]",
    "bg-rose-600",
    "bg-teal-600",
    "bg-indigo-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[hash] ?? "bg-primary";
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = review.text.length > PREVIEW_CHARS;
  const shown =
    !needsTruncate || expanded ? review.text : `${review.text.slice(0, PREVIEW_CHARS).trimEnd()}…`;
  const initial = (review.authorName.trim().charAt(0) || "?").toUpperCase();

  return (
    <article className="flex w-[min(100%,20.5rem)] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:w-full">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {review.profilePhotoUrl ? (
            <img
              src={review.profilePhotoUrl}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white ${avatarTone(review.authorName)}`}
              aria-hidden
            >
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{review.authorName}</p>
            {review.dateLabel ? <p className="text-sm text-slate-400">{review.dateLabel}</p> : null}
          </div>
        </div>
        {review.fromGoogle ? <GoogleGIcon className="mt-0.5 h-5 w-5 shrink-0" /> : null}
      </div>

      <StarRating rating={review.rating} />

      {review.text ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {shown}
          {needsTruncate ? (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="font-medium text-nav underline underline-offset-2"
              >
                {expanded ? "less" : "more"}
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

type GoogleReviewsProps = {
  data: GoogleReviewsPayload;
  /** When true, hide the header row (e.g. page already has an H1). */
  hideHeader?: boolean;
};

export function GoogleReviews({ data, hideHeader = false }: GoogleReviewsProps) {
  const viewAllHref = data.mapsUrl || "/reviews";
  const viewAllExternal = Boolean(data.mapsUrl);

  return (
    <section className="border-t border-slate-100 bg-[#f7f8fa] py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4">
        {!hideHeader ? (
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Our Customer&apos;s Reviews</h2>
              {data.source === "google" && data.rating != null && data.totalCount != null ? (
                <p className="mt-1 text-sm text-slate-500">
                  {data.rating.toFixed(1)}★ on Google · {data.totalCount.toLocaleString()} reviews
                </p>
              ) : null}
            </div>
            {viewAllExternal ? (
              <a
                href={viewAllHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                View All
              </a>
            ) : (
              <Link
                href={viewAllHref}
                className="shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                View All
              </Link>
            )}
          </div>
        ) : null}

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {data.source === "fallback" && !data.mapsUrl ? (
          <p className="mt-4 text-xs text-slate-400">
            Showing recent customer stories. Add Google Place credentials to load live Google reviews.
          </p>
        ) : null}
      </div>
    </section>
  );
}
