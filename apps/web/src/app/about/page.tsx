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
          SpicyCenter is an India-based spice sourcing and knowledge platform connecting international buyers with spices
          from India. We provide product information, spice guides and recipes to help importers, distributors, food
          businesses and other buyers make informed sourcing decisions.
        </p>
        <p>
          Buyers from around the world can enquire about our spices and sourcing opportunities. We focus on clear product
          information and business enquiries rather than displaying fixed prices on the website.
        </p>
        <aside className="my-6 rounded-lg border border-[#e6d5bc] bg-beige/70 px-4 py-4">
          <div className="space-y-2 text-slate-700 leading-relaxed">
            <p>
              SpicyCenter is a brand operated by Divit Global Ventures, a registered proprietorship based in India.
            </p>
            <p>
              Divit Global Ventures is registered under the Goods and Services Tax (GST) in India.
            </p>
            <p>
              Our business registration details are available for customer verification.
            </p>
          </div>
          <Link href="#gst-certificate" className="mt-3 inline-block font-semibold text-nav hover:underline">
            Verify our GST registration certificate →
          </Link>
        </aside>
      </div>
      <section className="mt-10">
        <h2 className="font-serif text-2xl mb-3">Spices for International Buyers</h2>
        <p className="text-slate-700 leading-relaxed">
          We serve importers, distributors, wholesalers and restaurant buyers looking for Indian spices such as cumin,
          chilli, turmeric and garam masala. Product information includes commonly used names in English, Hindi and Arabic
          where available, along with pack-size options ranging from 100 g to 1 metric ton.
        </p>
      </section>
      <section className="mt-10">
        <h2 className="font-serif text-2xl mb-3">Product Quality and Information</h2>
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <p>
            Spices are agricultural products, and their colour, aroma, oil content and flavour can vary depending on the
            harvest, origin, processing and storage conditions.
          </p>
          <p>
            We aim to provide clear, useful and accurate product information. We avoid unsupported laboratory claims,
            unverified health benefits and misleading product reviews. Product prices are shared through business enquiries
            rather than published on the website.
          </p>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="font-serif text-2xl mb-3">Product Information and Market Compliance</h2>
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <p>
            Product information such as ingredients, allergens, country of origin and instructions for use is important
            for international trade. We aim to make relevant information available to support applicable market-specific
            labelling and distance-selling requirements.
          </p>
          <p>
            Some products and destinations may also be subject to additional import controls or documentation requirements.
            These requirements depend on the product and destination market and should be assessed before shipment.
          </p>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="font-serif text-2xl mb-3">Spice Knowledge Alongside the Catalogue</h2>
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <p>
            SpicyCenter brings product discovery and spice education together. Our guides and articles help buyers
            understand spice varieties, regional characteristics, culinary uses and differences between products.
          </p>
          <p>
            Whether you are learning about cumin (jeera), exploring the characteristics of Kerala black pepper or comparing
            the colour and heat of Kashmiri chilli, our knowledge resources are designed to make spice selection easier.
          </p>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="font-serif text-2xl mb-3">Our Business Location</h2>
        <p className="text-slate-700 leading-relaxed">
          Our business operations are based in Ferozepur, Punjab, India. India is our sourcing base, and we serve
          international business enquiries from buyers across different markets. We aim to communicate our business
          location and operations transparently.
        </p>
      </section>
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
