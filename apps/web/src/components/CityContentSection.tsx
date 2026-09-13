import Link from "next/link";
import type { CityPageContent } from "@/lib/content/city-pages";
import { site, whatsappChatUrl } from "@/lib/site";

interface Props {
  content: CityPageContent;
}

export function CityContentSection({ content }: Props) {
  return (
    <div className="mt-12 pt-10 border-t border-slate-200">
      <div className="grid lg:grid-cols-2 gap-10 xl:gap-14">
        {/* Left column — main editorial content */}
        <article className="space-y-8 text-slate-700 leading-relaxed">
          <header>
            <h2 className="text-2xl font-bold text-primary mb-4">{content.headline}</h2>
            {content.intro.map((p, i) => (
              <p key={i} className="mb-4">
                {p}
              </p>
            ))}
          </header>

          <section>
            <h3 className="text-xl font-semibold text-primary mb-3">{content.delivery.heading}</h3>
            {content.delivery.paragraphs.map((p, i) => (
              <p key={i} className="mb-3">
                {p}
              </p>
            ))}
          </section>

          <section>
            <h3 className="text-xl font-semibold text-primary mb-3">{content.areas.heading}</h3>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {content.areas.items.map((area) => (
                <li key={area} className="flex items-start gap-2">
                  <span className="text-nav mt-0.5">✓</span>
                  {area}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-primary mb-3">
              spice in {content.label}
            </h3>
            <p className="mb-3">
              Indian spices in {content.label} means whole spices, powders, chillies, masalas, and bulk packs.
              {site.name} quotes shipping per product — we do not assume every SKU ships to every address.
            </p>
          </section>
        </article>

        {/* Right column — FAQs, categories, CTA */}
        <aside className="space-y-6">
          <section className="bg-slate-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">{content.whyUs.heading}</h3>
            <ul className="space-y-2 text-sm">
              {content.whyUs.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">{content.howTo.heading}</h3>
            <ol className="space-y-3 text-sm list-decimal list-inside marker:font-semibold marker:text-nav">
              {content.howTo.steps.map((step, i) => (
                <li key={i} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Shop by Category</h3>
            <ul className="space-y-3 text-sm">
              {content.relatedCategories.map((cat) => (
                <li key={cat.href}>
                  <Link href={cat.href} className="font-medium text-nav hover:underline">
                    {cat.label}
                  </Link>
                  <p className="text-slate-500 mt-0.5">{cat.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-nav text-white rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">Need help with your {content.label} order?</h3>
            <p className="text-sm text-white/90 mb-4">
              Our team helps with delivery timing, address format, and product selection.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/contact"
                className="bg-white text-nav px-4 py-2 rounded-lg font-medium hover:bg-slate-100"
              >
                Contact us
              </Link>
              <a
                href={whatsappChatUrl(`Hi, I need spice delivery to ${content.label}.`)}
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

      {/* Full-width FAQ — uses both columns visually */}
      <section className="mt-10 pt-8 border-t border-slate-200">
        <h3 className="text-xl font-semibold text-primary mb-6">
          Frequently Asked Questions — spice Delivery to {content.label}
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {content.faqs.map((faq) => (
            <div key={faq.q} className="bg-white border border-slate-100 rounded-xl p-5">
              <h4 className="font-semibold text-primary text-sm mb-2">{faq.q}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
