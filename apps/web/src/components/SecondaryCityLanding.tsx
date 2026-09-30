import Link from "next/link";
import type { SecondaryCity } from "@/lib/content/city-delivery-tiers";
import { exploreCategories, site, whatsappChatUrl } from "@/lib/site";

/** Shared template for secondary city spice delivery pages. */
export function buildSecondaryCityFaqs(city: SecondaryCity) {
  const place = `${city.name}, ${city.state}`;
  return [
    {
      q: `Do you ship spice products to ${place}?`,
      a: `Enter the ${place} address at checkout. Confirm the shipping quote on the product page — we do not promise a blanket nationwide SLA.`,
    },
    {
      q: `How is spice shipping quoted to ${place}?`,
      a: `Each product has its own quote. UK rates are per kilogram when that destination is enabled.`,
    },
    {
      q: `Is there a seasonal deadline?`,
      a: "SpicyCenter sells culinary spices year-round. There is no festival cutoff date.",
    },
  ] as const;
}

export function SecondaryCityLanding({ city }: { city: SecondaryCity }) {
  const place = `${city.name}, ${city.state}`;
  const faqs = buildSecondaryCityFaqs(city);

  return (
    <div className="mt-12 pt-10 border-t border-slate-200 max-w-3xl space-y-8 text-slate-700 leading-relaxed">
      <section>
        <h2 className="text-2xl font-bold text-primary mb-4">
          Indian spices in {place}
        </h2>
        <p className="mb-4">
          Shop SpicyCenter for whole spices, powders, chillies, masalas, and 10kg+ wholesale
          with shipping to {place} when that destination is configured. Confirm the quote on each product page.
        </p>
        <p>
          Browse the catalogue and send an enquiry. Worldwide delivery is confirmed in the reply.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-primary mb-3">Shop by category</h3>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {exploreCategories.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className="text-nav font-medium hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-primary mb-4">FAQ — {city.name}</h3>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <h4 className="font-semibold text-primary text-sm mb-1">{f.q}</h4>
              <p className="text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm">
        Need help?{" "}
        <a
          href={whatsappChatUrl(`Hi ${site.name}, I need help shipping to ${place}.`)}
          className="text-nav font-medium hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </p>
    </div>
  );
}
