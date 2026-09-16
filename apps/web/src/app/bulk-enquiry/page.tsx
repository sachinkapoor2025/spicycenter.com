import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import { BulkEnquiryForm } from "@/components/BulkEnquiryForm";

export const metadata: Metadata = pageMetadata({
  title: "Bulk spice enquiry — 100kg minimum",
  description:
    "Indicative bulk quotes for Indian spices to the UK and EU. 100kg minimum. Reference rates from Agmarknet with admin markup — not a checkout price for the cargo.",
  path: "/bulk-enquiry",
});

export default function BulkEnquiryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Bulk spice enquiry</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Get an indicative landed-cost estimate for 100kg and above. Mandi prints are a domestic wholesale reference, not
        an FOB export price — we apply your configured markup and never show the raw Agmarknet figure as a customer
        selling price.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading form…</p>}>
        <BulkEnquiryForm />
      </Suspense>
    </div>
  );
}
