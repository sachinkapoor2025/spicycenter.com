import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { BulkEnquiryForm } from "@/components/BulkEnquiryForm";

export const metadata: Metadata = pageMetadata({
  title: "Bulk spice enquiry — 100kg minimum",
  description:
    "Indicative bulk quotes for Indian spices to the UK, EU, United States and Canada. 100kg minimum. Same Indian spice cost; destination shipping and compliance differ. Not a checkout price for the cargo.",
  path: "/bulk-enquiry",
});

export default function BulkEnquiryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)] gap-10 items-start">
      <div>
      <h1 className="spice-heading text-4xl">Bulk spice enquiry</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Get an indicative landed-cost estimate for 100kg and above. For 10kg+ trade lots use{" "}
        <Link href="/wholesale" className="text-nav font-semibold hover:underline">
          wholesale Indian spices
        </Link>
        . Compare prints on{" "}
        <Link href="/spice-market-prices" className="text-nav font-semibold hover:underline">
          Indian spice market prices
        </Link>
        , or send a{" "}
        <Link href="/enquiry" className="text-nav font-semibold hover:underline">
          free spice enquiry
        </Link>
        {" "}if you are not yet at 100kg.
      </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading form…</p>}>
        <BulkEnquiryForm />
      </Suspense>
    </div>
  );
}
