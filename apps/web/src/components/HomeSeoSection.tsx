import Link from "next/link";
import { homepageInlineLinks } from "@/lib/content/page-inline-links";
import { homeSeoContent } from "@/lib/content/home-seo";
import { applyInlineLinks } from "@/lib/inline-links";
import { cityLinks, whatsappChatUrl } from "@/lib/site";

export function HomeSeoSection() {
  const { intro, categories, delivery, howItWorks, tradition, whyUs, faqs } = homeSeoContent;

  return (
    <section className="bg-slate-50 border-y border-slate-200" aria-labelledby="home-seo-heading">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-14">
          {/* Left — editorial */}
          <article className="space-y-8 text-slate-700 leading-relaxed">
            <header>
              <h2 id="home-seo-heading" className="text-2xl font-bold text-primary mb-4">
                {intro.heading}
              </h2>
              {intro.paragraphs.map((para, i) => (
                <p key={i} className="mb-4">
                  {applyInlineLinks(para, homepageInlineLinks)}
                </p>
              ))}
            </header>

            <section>
              <h3 className="text-xl font-semibold text-primary mb-3">{tradition.heading}</h3>
              {tradition.paragraphs.map((para, i) => (
                <p key={i} className="mb-4">
                  {para}
                </p>
              ))}
            </section>

            <section>
              <h3 className="text-xl font-semibold text-primary mb-3">{delivery.heading}</h3>
              {delivery.paragraphs.map((para, i) => (
                <p key={i} className="mb-4">
                  {para}
                </p>
              ))}
              <div className="flex flex-wrap gap-2 mt-2">
                {cityLinks.slice(0, 12).map((city) => (
                  <Link
                    key={city.slug}
                    href={`/cities/${city.slug}`}
                    className="text-xs sm:text-sm px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-nav hover:text-nav transition"
                  >
                    spice to {city.label}
                  </Link>
                ))}
              </div>
            </section>
          </article>

          {/* Right — sidebar cards */}
          <aside className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">{whyUs.heading}</h3>
              <ul className="space-y-2 text-sm">
                {whyUs.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="text-accent font-bold">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">{categories.heading}</h3>
              <p className="text-slate-600 text-sm mb-4">{categories.intro}</p>
              <ul className="space-y-3 text-sm">
                {categories.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="font-semibold text-nav hover:underline">
                      {item.label}
                    </Link>
                    <p className="text-slate-500 mt-0.5">{item.text}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                <Link href="/products" className="text-nav font-semibold hover:underline">
                  View all spice items →
                </Link>
              </p>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">{howItWorks.heading}</h3>
              <ol className="space-y-3 text-sm list-decimal list-inside marker:font-semibold marker:text-nav">
                {howItWorks.steps.map((step, i) => (
                  <li key={i} className="pl-1">
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm space-x-2">
                <Link href="/shipping" className="text-nav font-semibold hover:underline">
                  Shipping details →
                </Link>
                <Link href="/blog/indian-spices-for-curry" className="text-nav font-semibold hover:underline">
                  Curry spices →
                </Link>
              </p>
            </section>

            <section className="bg-nav text-white rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">Ready to cook with Indian spices?</h3>
              <p className="text-sm text-white/90 mb-4">
                Browse whole spices, powders, chillies, and bulk packs. Confirm shipping on the product page.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href="/products"
                  className="bg-white text-nav px-4 py-2 rounded-lg font-medium hover:bg-slate-100"
                >
                  Shop all spice items
                </Link>
                <a
                  href={whatsappChatUrl("Hi SpicyCenter, I need help with a spice order.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/60 px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  WhatsApp
                </a>
              </div>
            </section>
          </aside>
        </div>

        {/* Full-width FAQ */}
        <section className="mt-12 pt-10 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h3 className="text-xl font-semibold text-primary">Frequently Asked Questions</h3>
            <Link href="/faq" className="text-sm text-nav font-semibold hover:underline">
              View all FAQs →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white border border-slate-100 rounded-xl p-5">
                <h4 className="font-semibold text-primary text-sm mb-2">{faq.q}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
