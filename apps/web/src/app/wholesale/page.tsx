import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice wholesale supplier — 10kg minimum",
  description: "Wholesale Indian spices for restaurants, caterers, manufacturers, grocers and importers. Minimum 10kg. Request a quote.",
  path: "/wholesale",
});

export default function WholesalePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spice wholesale supplier</h1>
      <p className="mt-4 text-lg text-muted">
        SpicyCorner supplies restaurants, hotels, caterers, food manufacturers, grocery stores, retailers, importers and distributors.
      </p>
      <p className="mt-3 font-semibold">Minimum bulk order: 10kg</p>
      <p className="mt-2 text-sm text-muted">
        Initial prices can be calculated from weight, but wholesale still depends on grade, origin, crop, packaging and market. Always request a quote for commercial lots.
      </p>
      <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
        <li><Link className="text-nav" href="/wholesale/indian-spices">Indian spices wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/cumin">Cumin wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/turmeric">Turmeric wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/black-pepper">Black pepper wholesale</Link></li>
        <li><Link className="text-nav" href="/uk/indian-spices-wholesale">UK wholesale</Link></li>
        <li><Link className="text-nav" href="/bulk-spices">Bulk catalogue</Link></li>
      </ul>
      <h2 className="font-serif text-2xl mt-10 mb-4">Request wholesale quote</h2>
      <WholesaleQuoteForm />
    </div>
  );
}
