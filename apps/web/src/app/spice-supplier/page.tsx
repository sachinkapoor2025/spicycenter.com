import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice supplier UK & Europe — retail and 10kg+ wholesale",
  description:
    "SpicyCenter is an Indian spice supplier for UK and European kitchens, restaurants, grocers and importers. Retail packs and 10kg minimum wholesale. Request a quote.",
  path: "/spice-supplier",
});

export default function SpiceSupplierPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm text-muted">
        <Link href="/">Home</Link> / Indian spice supplier
      </p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">Indian spice supplier for the UK and Europe</h1>
      <p className="mt-4 text-lg text-muted leading-relaxed">
        SpicyCenter supplies whole spices, ground spices, chillies and masalas from India to cooks and trade buyers in
        the United Kingdom and listed European countries. We sell retail packs and bulk bags from 10kg. We do not claim a
        local warehouse in every city.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>Origin: India, with growing regions named when the lot supports it.</li>
        <li>Forms: whole and ground. Grades only when they apply to that spice.</li>
        <li>Packs: 100g–5kg retail; 10kg, 25kg and 50kg wholesale bags.</li>
        <li>Buyers: restaurants, hotels, caterers, manufacturers, grocers, importers and distributors.</li>
      </ul>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="text-nav font-semibold" href="/spices">
          Shop the catalogue →
        </Link>
        <Link className="text-nav font-semibold" href="/wholesale">
          Wholesale quotes →
        </Link>
        <Link className="text-nav font-semibold" href="/uk">
          UK delivery →
        </Link>
        <Link className="text-nav font-semibold" href="/legal/food-information">
          Food information →
        </Link>
      </div>
      <h2 className="font-serif text-2xl mt-12 mb-4">Request wholesale quote</h2>
      <p className="text-sm text-muted mb-4">10kg minimum on wholesale lines. Prices depend on grade, origin, crop, packaging and market.</p>
      <WholesaleQuoteForm />
    </div>
  );
}
