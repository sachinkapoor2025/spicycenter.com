import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice wholesale supplier — 10kg minimum",
  description: "Wholesale Indian spices for restaurants, caterers, manufacturers, grocers and importers. Minimum 10kg. Request a quote.",
  path: "/wholesale",
});

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product = "" } = await searchParams;
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)] gap-10 items-start">
      <div>
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
          UK and European buyers can request retail and 10kg+ quotes here. Other destinations use a{" "}
          <Link className="text-nav font-semibold hover:underline" href="/markets">
            free export-market enquiry
          </Link>
          . See also our{" "}
          <Link className="text-nav font-semibold hover:underline" href="/spice-supplier">
            Indian spice supplier
          </Link>{" "}
          page, or the{" "}
          <Link className="text-nav font-semibold hover:underline" href="/bulk-enquiry">
            bulk spice enquiry
          </Link>{" "}
          for 100kg+ cargo.
        </p>
      </div>
      </div>
      <div>
      <h2 className="font-serif text-2xl mb-4">Request wholesale quote</h2>
      <WholesaleQuoteForm defaultProduct={product} />
      </div>
    </div>
  );
}
