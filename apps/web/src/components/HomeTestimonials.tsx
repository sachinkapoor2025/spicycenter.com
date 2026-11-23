import Link from "next/link";
import { testimonials } from "@/lib/site";

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

const PLACEHOLDERS = [
  {
    name: "[Customer name]",
    text: "[PLACEHOLDER — replace with a verified customer review. Do not publish invented testimonials.]",
  },
  {
    name: "[Customer name]",
    text: "[PLACEHOLDER — replace with a verified customer review after order feedback is collected.]",
  },
  {
    name: "[Customer name]",
    text: "[PLACEHOLDER — replace with a verified customer review from a delivered order.]",
  },
] as const;

export function HomeTestimonials() {
  const reviews = testimonials.slice(0, 5);
  const usingPlaceholders = reviews.length === 0;
  const cards = usingPlaceholders
    ? PLACEHOLDERS.map((p, i) => ({ key: `placeholder-${i}`, name: p.name, text: p.text, rating: null as number | null }))
    : reviews.map((t) => ({ key: t.name, name: t.name, text: t.text, rating: t.rating as number | null }));

  return (
    <section className="bg-beige/50 border-y border-[#e6d5bc]">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <p className="spice-kicker">Testimonials</p>
        <h2 className="spice-heading text-2xl sm:text-3xl mt-2 mb-3">Customer reviews</h2>
        {usingPlaceholders ? (
          <p className="text-sm text-muted mb-8 max-w-2xl">
            Verified reviews are not in the project data yet. These cards are placeholders only and should be replaced
            with genuine customer feedback.
          </p>
        ) : (
          <p className="text-sm text-muted mb-8 max-w-2xl">Stories from customers who cook with SpicyCenter spices.</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <article key={card.key} className="card-spice p-5 flex flex-col">
              {card.rating != null ? <StarRating rating={card.rating} /> : (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Rating pending</p>
              )}
              <p className="text-sm text-charcoal leading-relaxed mt-3 flex-1">{card.text}</p>
              <p className="mt-4 font-semibold text-primary">{card.name}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm">
          <Link href="/reviews" className="text-nav font-semibold">
            Share a review →
          </Link>
        </p>
      </div>
    </section>
  );
}
