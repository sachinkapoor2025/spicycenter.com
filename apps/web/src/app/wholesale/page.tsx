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
      <h1 className="spice-heading text-3xl sm:text-4xl">Indian spice wholesale supplier</h1>
      <p className="mt-4 text-lg text-muted">
        SpicyCenter supplies restaurants, hotels, caterers, food manufacturers, grocery stores, retailers, importers and distributors.
      </p>
      <p className="mt-3 font-semibold">Minimum bulk order: 10kg</p>
      <div className="mt-4 space-y-3 text-sm text-muted leading-relaxed">
        <p>
          Initial prices can be calculated from weight, but wholesale still depends on grade, origin, crop, packaging and market. Always request a quote for commercial lots.
        </p>
        <p>
          Tell us whether you need whole or ground, 10kg, 25kg or 50kg bags, and whether the lot must match a named growing region
          (for example Kerala pepper or Unjha cumin). We will not print a region we cannot stand behind on that shipment.
        </p>
        <p>
          UK and European buyers can use this form. Delivery is quoted to the destination country in the header — not to the United States, Gulf or Australia from this storefront.
        </p>
      </div>
      <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
        <li><Link className="text-nav" href="/wholesale/indian-spices">Indian spices wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/cumin">Cumin wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/turmeric">Turmeric wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/black-pepper">Black pepper wholesale</Link></li>
        <li><Link className="text-nav" href="/wholesale/restaurants">Restaurants</Link></li>
        <li><Link className="text-nav" href="/wholesale/hotels">Hotels</Link></li>
        <li><Link className="text-nav" href="/wholesale/caterers">Caterers</Link></li>
        <li><Link className="text-nav" href="/wholesale/food-manufacturers">Food manufacturers</Link></li>
        <li><Link className="text-nav" href="/wholesale/grocery-retailers">Grocery retailers</Link></li>
        <li><Link className="text-nav" href="/wholesale/importers">Importers</Link></li>
        <li><Link className="text-nav" href="/wholesale/distributors">Distributors</Link></li>
        <li><Link className="text-nav" href="/spice-supplier">Indian spice supplier</Link></li>
        <li><Link className="text-nav" href="/bulk-spices">Bulk catalogue</Link></li>
      </ul>
      <h2 className="font-serif text-2xl mt-10 mb-4">Export-style bulk (100kg+)</h2>
      <p className="text-sm text-muted mb-4">
        For 100kg and above with an indicative UK/EU cost breakdown, use the{" "}
        <Link className="text-nav font-semibold" href="/bulk-enquiry">
          bulk enquiry calculator
        </Link>
        . The form below is still the general wholesale request (from 10kg).
      </p>
      <h2 className="font-serif text-2xl mt-10 mb-4">Request wholesale quote</h2>
      <WholesaleQuoteForm />
    </div>
  );
}
