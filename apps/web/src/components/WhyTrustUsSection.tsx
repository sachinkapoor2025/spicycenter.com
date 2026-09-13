import Link from "next/link";
import { trustFacts, trustHighlights } from "@/lib/trust";
import { TrustBadges } from "@/components/TrustBadges";

export function WhyTrustUsSection() {
  return (
    <section className="bg-white border-y border-slate-100" aria-labelledby="why-trust-heading">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-nav mb-2">{trustFacts.seasonLabel}</p>
          <h2 id="why-trust-heading" className="text-2xl md:text-3xl font-bold text-primary mb-3">
            Why Choose SpicyCorner.com?
          </h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            SpicyCorner.com is a trusted destination for Indian spices, spices, and party
            supplies worldwide. {trustFacts.fulfillment}.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {trustHighlights.map((item) => {
            const inner = (
              <>
                <span className="text-2xl mb-2 block" aria-hidden>
                  {item.icon}
                </span>
                <h3 className="font-bold text-primary text-sm mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
              </>
            );
            return "href" in item && item.href ? (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:border-nav hover:shadow-sm transition"
              >
                {inner}
              </a>
            ) : (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                {inner}
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto">
          <TrustBadges />
          <p className="text-center text-xs text-slate-500 mt-4">
            Operated by {trustFacts.operator}.{" "}
            <Link href="/about" className="text-nav hover:underline">
              About our team
            </Link>
            {" · "}
            <Link href="/reviews" className="text-nav hover:underline">
              Share your review
            </Link>
            {" · "}
            <Link href="/returns" className="text-nav hover:underline">
              Satisfaction guarantee
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
