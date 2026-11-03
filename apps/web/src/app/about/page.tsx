import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About SpicyCenter: Indian Spice Supplier from India",
  description:
    "SpicyCenter is an Indian spice supplier. Enquire for spices, masalas and food ingredients from India for the UK, Europe and worldwide.",
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
          spice guides and recipes. Buyers enquire from anywhere. India is the origin. Prices are not published on this website.
        </p>
        <aside className="my-6 rounded-lg border border-[#e6d5bc] bg-beige/70 px-4 py-4">
          <p className="font-semibold text-primary">Looking for proof of our business registration?</p>
          <p className="mt-2 text-slate-700 leading-relaxed">
            SpicyCenter is operated by Divit Global Ventures, a registered Indian business.
          </p>
          <Link href="#gst-certificate" className="mt-3 inline-block font-semibold text-nav hover:underline">
            Verify our GST registration certificate →
          </Link>
        </aside>
        <p>
          Importers, distributors and restaurant buyers can enquire for the same cumin, chilli or garam masala
          with honest names: English, Hindi, Arabic on featured spices, and pack sizes from 100 gm to 1 metric ton.
        </p>
        <p>
          Spices are agricultural goods. Colour, oil and aroma change with harvest, storage and grind. We do not invent
          laboratory numbers, medical claims or fake reviews, and we do not publish a price on the website.
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
          Our operations address is in Ferozepur, Punjab, India. We do not pretend to operate a warehouse in every city we
          write about.
        </p>
      </div>
      <section id="gst-certificate" className="mt-10 scroll-mt-52">
        <h2 className="font-serif text-2xl mb-3">GST Registration Certificate</h2>
        <p className="text-slate-700 leading-relaxed">
          This certificate is provided so customers can verify the business registration.
        </p>
        <a
          href="/images/gst-registration-certificate.png"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-nav font-semibold"
        >
          Open full size
        </a>
        <Image
          src="/images/gst-registration-certificate.png"
          alt="GST registration certificate"
          width={1055}
          height={1491}
          unoptimized
          className="mt-4 h-auto w-full"
        />
      </section>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/contact" className="text-nav font-semibold">Contact</Link>
        <Link href="/uk" className="text-nav font-semibold">UK shoppers</Link>
        <Link href="/eu" className="text-nav font-semibold">Europe</Link>
        <Link href="/spice-guide" className="text-nav font-semibold">Spice guide</Link>
      </div>
    </div>
  );
}
