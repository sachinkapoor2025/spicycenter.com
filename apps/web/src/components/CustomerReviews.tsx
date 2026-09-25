import Link from "next/link";
import Image from "next/image";
import { testimonials } from "@/lib/site";
import { resolveImageUrl } from "@/lib/images";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-gold" : "text-slate-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function CustomerBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      SpicyCenter customer
    </span>
  );
}

type CustomerReviewsProps = {
  showIntro?: boolean;
};

export function CustomerReviews({ showIntro = true }: CustomerReviewsProps) {
  return (
    <section className="bg-white border-t border-slate-100 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-3 md:mb-4">
          Customer reviews
        </h2>
        {showIntro && (
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mb-8 md:mb-10 leading-relaxed">
            Approved reviews only. Each one can show a display name, country, product, review and rating.{" "}
            <Link href="/reviews" className="text-nav font-semibold hover:underline">
              Share your review →
            </Link>
          </p>
        )}
        {!showIntro && <div className="mb-8" />}

        {testimonials.length === 0 ? (
          <p className="text-sm text-muted max-w-2xl">
            No approved reviews are published yet. Submissions stay off the site until they are checked.
          </p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {testimonials.map((review) => (
            <article key={review.name} className="flex flex-col">
              <div className="relative w-full max-w-[220px] aspect-[2/3] rounded-[999px] overflow-hidden bg-slate-100 mb-5 mx-auto sm:mx-0">
                <Image
                  src={resolveImageUrl(review.image)}
                  alt={`${review.name} customer review`}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                <h3 className="text-lg font-bold text-slate-800">{review.name}</h3>
                <CustomerBadge />
                <span className="text-xs text-slate-400">{review.timeAgo}</span>
              </div>

              <StarRating rating={review.rating} />

              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{review.text}</p>
            </article>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
