import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `About ${site.name}`,
  description: site.description,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <p className="text-xs tracking-[0.2em] text-nav font-semibold">SPICYCORNER</p>
      <h1 className="font-serif text-4xl mb-6 mt-2">About {site.name}</h1>
      <div className="space-y-4 text-slate-700 leading-relaxed">
        <p>
          {site.name} ({site.domain}) is an Indian spice catalogue and knowledge site for worldwide business enquiries:
          spice guides, recipes, and indicative Indian market prices. Buyers enquire from anywhere. India is the origin.
        </p>
        <p>
          Importers, distributors and restaurant buyers can enquire for the same cumin, chilli or garam masala
          with honest names: English, Hindi, Arabic on featured spices, and pack sizes from 100 gm to 1 metric ton.
        </p>
        <p>
          Spices are agricultural goods. Colour, oil and aroma change with harvest, storage and grind. We do not invent
          laboratory numbers, medical claims, fake reviews, or unsourced “today’s mandi rate” as a selling price.
          Indicative Indian market prices, when published, carry date, market, grade and source, and they are never overwritten.
        </p>
        <p>
          Food-information fields (ingredients, allergens, origin, instructions for use) exist so UK and EU distance-selling
          rules can be completed properly before a line goes fully live. Some dried spices from India can face increased official
          controls; that belongs in compliance notes, not in small print you cannot find.
        </p>
        <p>
          The shop and the encyclopaedia share one catalogue. If you want to know what jeera is, how Kerala pepper differs from
          a generic “black pepper” blend, or whether Kashmiri chilli is mostly colour or heat, the spice guide sits next to the bag.
        </p>
        <p>
          Two addresses appear on the site because they are real: Ferozepur, Punjab (sourcing and operations in India) and
          Southampton, United Kingdom (UK presence). We do not pretend to operate a warehouse in every city we write about.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/contact" className="text-nav font-semibold">Contact</Link>
        <Link href="/uk" className="text-nav font-semibold">UK shoppers</Link>
        <Link href="/eu" className="text-nav font-semibold">Europe</Link>
        <Link href="/spice-guide" className="text-nav font-semibold">Spice guide</Link>
      </div>
    </div>
  );
}
